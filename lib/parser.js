var token = null;
var token_stream = [];

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

function set_token_stream(ts) {
    token_stream = ts;
    token = null;
}

function advance(id) {
    if (id && token.id !== id) {            
        throw new Error("Expected token " + id);
    }
    if (token_stream.length <= 0) {
        token = symbol_table.get_token({id:"(end)"});
    }
    else {
        var t = token_stream.shift();
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
    s.nud = nud || function () {
        this.first = parse();
        return this;
    };
    return s;
}

// need to account for inlines that contain inline fragments, i.e. **there is `` some bold** 
// - mutate the `` back into a string. But handle this later.
function inline(id, nud) {
    var s = symbol(id);
    s.nud = nud || function () {
        this.first = parse();
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
        this.first = a;
        return this;
    }
}

exports.prefix = prefix;
exports.symbol = symbol;
exports.get_token = symbol_table.get_token;
exports.advance = advance;
exports.set_token_stream = set_token_stream;
exports.parse = parse;
exports.body_element = body_element;

symbol("(string)");
symbol("(end)");
symbol("\n\n");
inline("**");
body_element("paragraph");
