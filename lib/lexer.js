// BOGUS: need to specify correct leading & trailing characters for start & end tokens
// - http://docutils.sourceforge.net/docs/ref/rst/restructuredtext.html#inline-markup
// Rules 1-4
// - start tokens:
//   - must be preceded by whitespace, begin text block, or (crazy list)
//   - must be followed by non whitespace or (crazy list)
// - end tokens: 
//   - must be preceded by non whitespace or (crazy list)
//   - must be followed by whitespace, end text block, or (crazy list)
// - Notes: some overlap in (crazy list)
// - in Cheops, begin text block is equivalent to being preceded by indent token 
//   - that indicates a newline, which means whitespace
// - likewise, end text block is equivalent to being followed by an indent token
//   - which is equiv to $ -- so nothing fancy needed for this regexp, just include $
// Rule 5
// - start token preceded by '"([{<, cannot be immediately followed by corresponding '")]}<.
// - mutate and fix during parsing? Or lexing? If parsing, we need the prev token and the next token. 
// Rule 6
// - start string must NOT be immediately closed by its end string
// - definitely something to mutate & fix during parsing
// - parsing has to match start & end tokens anyway, mutate a `` inside two ** **, etc.
// Rule 7
// - There are backslash escaping rules! These are more general than just applying to inlines.
// And also:
// - interpreted text may be preceded or followed by a :role:
// - again, create the role token blindly, then mutate & fix during parsing...
// Strategy:
// - be naive and capture all start and end tokens, plus capture the preceding & following char 
// - pass this into inline_token, use prev and following chars, apply complex rules
//   - tests: is_inline_start_token(), is_inline_end_token()
//   - try to handle Rules 1-5 this way
// - Rule 6 -- mutate & fix during parsing
// - Rule 7: ??
// - :role: -- mutate & fix during parsing

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
    var pattern = /(\*\*|\*(?!\*))/g;
    
    function add(token) {
        if (token) {
           token_line.push(token); 
        }
    }
    
    add(indent_token(line));
    
    while ((matches = pattern.exec(line)) !== null) {
        add(string_token(line, last_index, matches.index));
        add(inline_token(matches));

        // Save the index to start the next match for the next iteration,
        // as the start point for slicing out the next string token.
        last_index = pattern.lastIndex;
    }
    // after we are out of matches, get the last string token, if any
    add(string_token(line, last_index));

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
    // No match means we've broken out of the while loop, so just 
    // return the rest of the string.
    end = end !== undefined ? end : line.length;
    var token = {
        id: "(string)",
        value: line.slice(begin, end)
    };
    
    if (begin === 0) {
        // This means we've just started the line, so trim off 
        // leading whitespace, since the (indent) token captures that.
        token.value = token.value.replace(/^\s*/, '');
    }
    
    return (token.value === "") ? null : token;
}

// Find and return an inline begin or end marker.
// CURRENTLY BOGUS, REWRITE
// - check whether this is a start or end token
// - if either returns true, return as an inline token
// - otherwise return as a string token 
//   - is_inline_*_token() will be inspecting capture groups directly
function inline_token(matches) {
    var token = {};
    var prev_char = matches.input.charAt(matches.index - 1);
    var next_char = matches.input.charAt(matches.index + matches[0].length);
    token.id = token.value = matches[0];

    return token;
}

// TODO does not handle undefined or funny wrapping rules yet:
// - start token preceded by '"([{<, cannot be immediately followed by corresponding '")]}<.
function is_inline_start(prev_char, next_char) {
    var re_prev = /[\s'"\(\[\{<\-\/:\u2018\u201c\u2019\u00AB\u00A1\u00BF\u2010\u2011\u2012\u2013\u2014\u00A0]/;
    var re_next = /[\S\u2010\u2011\u2012\u2013\u2014\u00A0]/;
    
    return re_prev.test(prev_char) && re_next.test(next_char);
}

// TODO does not handle undefined yet:
function is_inline_end(prev_char, next_char) {
    var re_prev = /[\S\u2010\u2011\u2012\u2013\u2014\u00A0]/;
    var re_next = /[\s'"\)\]}>\-\/:\.,;!\?\\\u2019\u201D\u00BB\u2010\u2011\u2012\u2013\u2014\u00A0]/;

    return re_prev.test(prev_char) && re_next.test(next_char);
}

exports.lex = lex;
exports.string_token = string_token;
exports.inline_token = inline_token;
exports.indent_token = indent_token;
exports.tabs_to_spaces = tabs_to_spaces;
exports.is_inline_start = is_inline_start;
exports.is_inline_end = is_inline_end;