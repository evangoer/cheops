var token;
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

var token_stream = {
    stream: [],
    set_token_stream: function(ts) {
        stream = ts;
    },
    advance: function(id) {
        if (id && token.id !== id) {            
            throw new Error("Expected token " + id);
        }
        
        if (stream.length <= 0) {
            token = symbol_table.get_token({id:"(end)"});
        }
        else {
            token = symbol_table.get_token(stream.shift());
            
        }
        return token;
    }
}

function symbol(id) {
    var s = {};
    s.id = s.value = id;
    s.nud = function() { return this };
    symbol_table.define(s);
    return s;
}

parser.symbol = symbol;
parser.get_token = symbol_table.get_token;
parser.advance = token_stream.advance;
parser.set_token_stream = token_stream.set_token_stream;

symbol("(string)");
symbol("(end)");
symbol("**");