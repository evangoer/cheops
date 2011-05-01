var token = null;

var token_stream = {
    tokens: [[]],
    line: 0,
    next: function() {
        if (this.tokens[this.line].length > 0) {
            this.line += 1;
        }      
        if (this.line >= this.tokens.length) {
            return symbol_table.get_token({id: "(end)"});
        }
        return this.tokens[this.line].shift();
    },
    is_next_line_empty: function() {
        var line = this.line, tokens = this.tokens;
        if (line + 1 >= tokens.length) {
            return true;
        }
        else if (tokens[line + 1].length === 1 && tokens[line + 1][0].id === "(indent)"){
            return true;
        }
        else {
            return false;
        }
    },
    set: function(ts) {
        this.tokens = ts;
        this.line = 0;
        token = null; // side effect
    }
};

var symbol_table = {
    table: {},
    define: function(sym) {
        symbol_table.table[sym.id] = sym;
    },
    get_token: function(tok) {
        if (tok.id === "(string)") {
            var t = Object.create(symbol_table.table[tok.id]);
            t.value = tok.value;
            return t;
        }
        else {            
            return symbol_table.table[tok.id];
        }
    }
}

function advance(id) {
    if (id && token.id !== id) {            
        throw new Error("Expected token " + id);
    }
    else {
        var t = token_stream.next();
        token = symbol_table.get_token(t);
        if (token === undefined) {
            throw new Error("Symbol '" + t.id + "' never defined in the symbol table.");
        }
    }
    return token;
}

function parse() {
    var t = token;
    advance();
    return t.nud();
}

function symbol(id) {
    var s = {};
    s.id = s.value = id;
    s.nud = function() { return this };
    symbol_table.define(s);
    return s;
}

// use for bullets & other things? 
// currently untested and unused
function prefix(id, nud) {
    var s = symbol(id);
    s.children = [];
    s.nud = nud || function () {
        this.children[0] = parse();
        return this;
    };
    return s;
}

// need to account for inlines that contain inline fragments, i.e. **there is `` some bold** 
// - mutate the `` back into a string. But handle this later.
function inline(id, nud) {
    var s = symbol(id);
    s.children = [];
    s.nud = nud || function () {
        this.children[0] = parse();
        advance(id);
        return this;
    };
    return s;
}

// - What is a paragraph? 
//   - it is a type of body element
//   - in general body elements may contain other body elements, but paragraphs only contain inlines & strings
//   - starts with a newline (except at the beginning of a doc)
//   - may contain newlines, strings, and inlines
//   - ends with a double newline
//   - must maintain the same indent level throughout
function body_element(id, nud) {
    var s = symbol(id);
    var a = [];
    s.nud = nud || function() {
        if (token.id !== "\n\n") {
            while(true) {
                a.push(parse());
                if (token.id === "\n\n" || token.id === "(end)") {
                    break;
                }
            }
        }
        this.children = a;
        return this;
    }
}

// compound body elements: local substructure (body subelements) and body elements, but no text data.
// - admonition, attention, block_quote, bullet_list, caution, citation, compound, 
//   container, danger, definition_list, enumerated_list, error, field_list, figure, 
//   footnote, hint, important, line_block, note, option_list, system_message, table, tip, warning

// What do simple body elements have in common? 
//   to implement: comment, doctest_block, image, literal_block, paragraph, substitution_definition, target
//   no implement: pending, raw, rubric
// - they are empty or contain text data directly
// - they are separated by empty lines. When the next line is empty, stop.
// - because they do not generate child body elements, they do not need intelligence about containing other body elements
// - need the ability to peek ahead at next line? 

// What does a paragraph need?
// - need the ability to tell if next line is empty
// - nud() would be:
//      set the indent level 
//      while next line is not empty
//          check indent level -- throw an error if it
//          parse inline tokens and push them to the children array


// Need to define an (indent) symbol
// Need to augment advance() with intelligence about (indent)

exports.prefix = prefix;
exports.symbol = symbol;
exports.get_token = symbol_table.get_token;
exports.advance = advance;
exports.parse = parse;
exports.body_element = body_element;
exports.token_stream = token_stream;

symbol("(string)");
symbol("(end)");
symbol("(indent)");
symbol("\n\n");
inline("**");
body_element("paragraph");
