// http://docutils.sourceforge.net/docs/ref/rst/restructuredtext.html#inline-markup
// Rule 6
// - start string must NOT be immediately closed by its end string
// - definitely something to mutate & fix during parsing
// - parsing has to match start & end tokens anyway, mutate a `` inside two ** **, etc.
// Rule 7
// - There are backslash escaping rules! These are more general than just applying to inlines.
// Strategy:
// - be naive and capture all start and end tokens
// - Rules 1-5:
//   - pass this into inline_token(), use prev and following chars, apply regexps
//   - tests: is_inline_start_token(), is_inline_end_token()
// - Rule 6: mutate & fix during parsing
// - Rule 7: ??
// - :role: -- mutate & fix during parsing

// Not yet supported:
// - Hyperlink references: only `foo bar`_ supported. Not word_
// - plain url links not supported.
function lex(input) {
    var i, tokens = [];
    
    if (typeof input === "string") {
        var lines = input.split(/\r?\n/);
        for (i = 0; i < lines.length; i += 1) {
            tokens.push(process_line(lines[i]));
        }
    }
    return tokens;
}

function process_line(line) {
    var matches, str_token;
    var token_line = [];
    var last_index = 0;
    
    // strong|emph|target|href|lit|role+interp|interp+role|interp|sub|foot|foot
    // rolename pattern is overbroad but we further check it inside inline_token()
    var pattern = /\*\*|\*(?!\*)|_`|`_|``|:[\w\.\-]*:`|`:[\w\.\-]*:|`(?!`)|\||\[|\]_/g;
    
    // the *_token() functions usually return single tokens, but sometimes arrays.
    function append(token) {
        var i;
        if (token instanceof Array) {
            for (i = 0; i < token.length; i += 1){
                if (token[i]) {
                    token_line.push(token[i]);
                }
            }
        }
        else if (token) {
           token_line.push(token); 
        }
    }
    
    append(indent_token(line));
    
    while ((matches = pattern.exec(line)) !== null) {
        append(string_token(line, last_index, matches.index));
        append(inline_token(matches));

        // Save the index to start the next match for the next iteration,
        // as the start point for slicing out the next string token.
        last_index = pattern.lastIndex;
    }
    // after we are out of matches, get the last string token, if any
    append(string_token(line, last_index));

    return token_line;
}

// Each line starts with an indent token containing 0
// or more whitespace chars.
function indent_token(line) {
    var raw_whitespace = /(^\s*)/.exec(line);
    var whitespace = tabs_to_spaces(raw_whitespace[0]);
    return {
        id: "(indent)",
        value: whitespace.length
    };
}

// Docutils spec says: Tabs -> spaces with tab stop = 8.
// Form feed, vertical tab -> single space.
function tabs_to_spaces(ws) {
    var whitespace = ws.replace(/[\v\f]/, " ");
    var tabstops = whitespace.split("\t");
    var i, spaces = 0;
    
    // Sum tabstop lengths EXCEPT for the last array element
    for (i = 0; i < tabstops.length - 1; i++) {
        spaces += Math.floor(tabstops[i].length / 8 + 1) * 8;
    }
    // Last array element is actually after all tabstops; add it directly
    spaces += tabstops[i].length;
    return (new Array(spaces + 1)).join(" ");
}

// We want the chunk of the string:
// FROM where to start from the previous iteration (last_index)
// TO the index where we just matched in this iteration (matches.index)
function string_token(line, begin, end) {
    // No end means we've broken out of the while loop, so just 
    // return the rest of the string.
    end = end !== undefined ? end : line.length;
    var token = {
        id: "(string)",
        value: line.slice(begin, end)
    };
    
    if (begin === 0) {
        // Line start means trim off leading whitespace; that's in the (indent) token.
        token.value = token.value.replace(/^\s*/, '');
    }
    
    return (token.value === "") ? null : token;
}

// Find and return an inline start or end token. If the token does not
// adhere to various crazy rules about which characters may precede and
// follow start and end tokens, yield a string token instead.
//
// This function just returns simple ` tokens etc., as opposed to 
// determining whether something is definitely a start or end token, and  
// for which inline construct. That work is delegated to the parser. 
// 
// Can return an array of simple inline tokens in certain cases. For 
// example, :foo:`bar... yields [ROLE,INTERP]
function inline_token(matches) {
    var token = {};
    var p_char = matches.input.charAt(matches.index - 1);
    var n_char = matches.input.charAt(matches.index + matches[0].length);

    function is_role() {
        return matches[0].charAt(0) === ":" || matches[0].charAt(matches[0].length - 1) === ":";
    }
    
    function role_tokens() {
        var raw_tokens = matches[0].split("`");
        var role_ix    = (raw_tokens[0].length > 0) ? 0 : 1;
        var interp_ix  = (raw_tokens[0].length > 0) ? 1 : 0;
        var rolename   = raw_tokens[role_ix].replace(/:/g, "");
        var tokens = [2];

        // Any -._ in a rolename must be interior, so check the endpoints
        if ((/^[A-Za-z0-9]/.test(rolename)) && (/[A-Za-z0-9]$/.test(rolename))) {
            tokens[role_ix] = {id: "(role)", value: rolename};
        }
        else {
            tokens[role_ix] = {id: "(string)", value: raw_tokens[role_ix]};
        }
        tokens[interp_ix] = {id: "`", value: "`"};
        return tokens;
    }

    if (is_inline_start(p_char, n_char) || is_inline_end(p_char, n_char)) {
        if (is_role()) {
            return role_tokens();
        }
        else {
            token.id = matches[0];            
        }
    }
    else {
        token.id = "(string)";
    }
    token.value = matches[0];

    return token;
}

// Supports Rules 1-5 from http://docutils.sourceforge.net/docs/ref/rst/restructuredtext.html#inline-markup
function is_inline_start(prev_char, next_char) {
    var re_prev = /[\s'"\(\[\{<\-\/:\u2018\u201c\u2019\u00AB\u00A1\u00BF\u2010\u2011\u2012\u2013\u2014\u00A0]/;
    var re_next = /[\S\u2010\u2011\u2012\u2013\u2014\u00A0]/;
    var wrapper_char_map = {"'":"'", "\"":"\"", "(":")", "[":"]", "{":"}", "<":">"};
    prev_char = (prev_char === "") ? " " : prev_char;

    if (wrapper_char_map[prev_char] === next_char) {
        return false;
    }
    return re_prev.test(prev_char) && re_next.test(next_char);
}

// Supports Rules 1-5 from http://docutils.sourceforge.net/docs/ref/rst/restructuredtext.html#inline-markup
function is_inline_end(prev_char, next_char) {
    var re_prev = /[\S\u2010\u2011\u2012\u2013\u2014\u00A0]/;
    var re_next = /[\s'"\)\]}>\-\/:\.,;!\?\\\u2019\u201D\u00BB\u2010\u2011\u2012\u2013\u2014\u00A0]/;
    next_char = (next_char === "") ? " " : next_char;

    return re_prev.test(prev_char) && re_next.test(next_char);
}

exports.lex = lex;
exports.string_token = string_token;
exports.inline_token = inline_token;
exports.indent_token = indent_token;
exports.tabs_to_spaces = tabs_to_spaces;
exports.is_inline_start = is_inline_start;
exports.is_inline_end = is_inline_end;