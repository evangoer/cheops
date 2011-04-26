
// Currently the inline regexes are bogus because there are rules for 
// for which characters may appear before & after an inline token.
// - use a capture group to get the token of interest
// - but exclude chars we don't want (such as the char following a **)
// - as a literal regexp, this pattern might get unmanageable pretty fast... 
var pattern = /(\*\*|\*(?!\*))/g

function lex(input) {
    var lines = input.split("\n"),
        tokens = [],
        matches,
        last_index,
        str_token;
    
    for (var i = 0; i < lines.length; i += 1) {
        last_index = 0;
        tokens.push(indent_token(lines[i]));
        
        while ((matches = pattern.exec(lines[i])) !== null) {
            str_token = string_token(lines[i], last_index, matches);
            if (str_token) {
                tokens.push(str_token);
            }
            // Save the index to start the next match for the next iteration,
            // as the start point for slice out the next string token.
            last_index = pattern.lastIndex;
                    
            tokens.push(inline_token(matches));
        }
        // after we are out of matches, get the last 
        tokens.push(string_token(lines[i], last_index, null));
    }
    return tokens;
}

// Each line starts with an indent token containing 0
// or more whitespace chars.
function indent_token(line) {
    var raw_whitespaces = /(^\s*)/.exec(line);
    var whitespace = tabs_to_spaces(raw_whitespace);
    return {
        id: "(indent)",
        value: whitespace[0].length
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
//
// TODO we get a "bonus" empty string token in cases where the line
// starts with an inline token. Perhaps this is harmless?
function string_token(line, last_index, matches) {
    // No match means we've broken out of the while loop, so just 
    // return the rest of the string.
    var endpoint = (matches !== null) ? matches.index : line.length;
    var token = {
        id: "(string)",
        value: line.slice(last_index, endpoint)
    };
    
    if (last_index === 0) {
        // This means we've just started the line, so trim off 
        // leading whitespace, since the (indent) token captures that.
        token.value = token.value.replace(/^\s*/, '');
    }
    return token;
}

// Find and return an inline begin or end marker.
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

exports.inline_token = inline_token;
exports.tabs_to_spaces = tabs_to_spaces;