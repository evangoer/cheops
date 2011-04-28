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

// Change pattern to include: ([^\*]?) at beginning and end 
// I.e. match optional non-*, followed by **, followed by optional non-* 
// Can't just match on optional '.', because then we won't match the **. 
// Extend to include other chars we're looking for in inlines. `, |, etc.
// WARNING: including prev & next chars throws off the math for string_token()
// - match.index is 1 earlier, pattern.lastIndex 1 later
// - except at the beginning and end of a line? 
var pattern = /(\*\*|\*(?!\*))/g

function lex(input) {
    var tokens = [];
    
    if (typeof input === "string") {
        var lines = input.split(/\r?\n/);
        for (var i = 0; i < lines.length; i += 1) {
            tokens.push(process_line(lines[i]));
        }
    }
    return tokens;
}

function process_line(line) {
    var matches, str_token;
    var token_line = [];
    var last_index = 0;
    
    token_line.push(indent_token(line));
    
    while ((matches = pattern.exec(line)) !== null) {
        str_token = string_token(line, last_index, matches);            
        if (str_token !== null) {
            token_line.push(str_token);
        }

        // Save the index to start the next match for the next iteration,
        // as the start point for slicing out the next string token.
        last_index = pattern.lastIndex;
                
        token_line.push(inline_token(matches));
    }
    // after we are out of matches, get the last string token, if any
    str_token = string_token(line, last_index);
    if (str_token !== null) {
        token_line.push(str_token);
    }
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
    var spaces = 0;
    
    // Sum tabstop lengths EXCEPT for the last array element
    for (var i = 0; i < tabstops.length - 1; i++) {
        spaces += Math.floor(tabstops[i].length / 8 + 1) * 8;
    }
    // Last array element is actually after all tabstops; add it directly
    spaces += tabstops[i].length;
    return (new Array(spaces + 1)).join(" ");
}

// We want the chunk of the string:
// FROM where to start from the previous iteration (last_index)
// TO the index where we just matched in this iteration (matches.index)
function string_token(line, last_index, matches) {
    // No match means we've broken out of the while loop, so just 
    // return the rest of the string.
    var endpoint = (!matches) ? line.length : matches.index;
    var token = {
        id: "(string)",
        value: line.slice(last_index, endpoint)
    };
    
    if (last_index === 0) {
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
// - probably don't need the for loop over matches[i] anymore
//   - is_inline_*_token() will be inspecting capture groups directly
function inline_token(matches) {
    var token = {};
    matches = matches || []; // guard
    for (var i = 1; i < matches.length; i += 1) {
        if (matches[i] !== undefined) {
            token.value = token.id = matches[i];
            return token;
        }
    }
}

// SPECIFICATION:
// - must be preceded by whitespace, begin text block, or (crazy list)
//   - in Cheops, begin text block is equivalent to being preceded by indent token 
// - must be followed by non whitespace or (crazy list)
// - start token preceded by '"([{<, cannot be immediately followed by corresponding '")]}<.
function is_inline_start_token(matches) {

}

// SPECIFICATION:
// - must be preceded by non whitespace or (crazy list)
// - must be followed by whitespace, end text block, or (crazy list)
//   - in Cheops, end text block is equivalent to being followed by an indent token, also equiv to $
function is_inline_end_token(matches) {
    
}

exports.lex = lex;
exports.string_token = string_token;
exports.inline_token = inline_token;
exports.indent_token = indent_token;
exports.tabs_to_spaces = tabs_to_spaces;