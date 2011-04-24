var token;
var token_stream = [];
var parser = exports;

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
}

function advance(id) {
    if (id && token.id !== id) {            
        throw new Error("Expected token " + id);
    }
    
    if (token_stream.length <= 0) {
        token = symbol_table.get_token({id:"(end)"});
    }
    else {
        token = symbol_table.get_token(token_stream.shift());
        
    }
    return token;
}

function symbol(id) {
    var s = {};
    s.id = s.value = id;
    s.nud = function() { return this };
    symbol_table.define(s);
    return s;
}

function prefix(id, nud) {
    var s = symbol(id);
    s.nud = nud || function () {
        this.first = parse();
        return this;
    };
    return s;
}

function parse() {
    var t = token;
    advance();
    return t.nud();
}

// need an inline() function, derivative of prefix, that advances to the next close token
// need to be parsing in the context of a body paragraph
// - otherwise we get a bunch of disconnected strings and inlines containing strings
// need to account for inlines that contain inline fragments, i.e. **there is `` some bold** 
// - mutate the `` back into a string. But handle this later.

parser.prefix = prefix;
parser.symbol = symbol;
parser.get_token = symbol_table.get_token;
parser.advance = advance;
parser.set_token_stream = set_token_stream;

symbol("(string)");
symbol("(end)");
symbol("**");