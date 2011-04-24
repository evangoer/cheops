var token;
var parser = exports;

parser.symbols = {
    table: {},
    define: function(sym) {
        this.table[sym.id] = sym;
    },
    get_token: function(tok) {
        if (tok.id === "(string)") {
            var t = Object.create(this.table[tok.id]);
            t.value = tok.value;
            return t;
        }
        else {
            return this.table[tok.id];
        }
    }
};

parser.token_stream = {
    stream: [],
    set: function(token_stream) {
        stream = token_stream;
    },
    advance: function(id) {
        if (id && token.id !== id) {            
            throw new Error("Expected token " + id);
        }
        
        if (stream.length <= 0) {
            token = parser.symbols.get_token({id:"(end)"});
        }
        else {
            token = parser.symbols.get_token(stream.shift());
            
        }
        return token;
    }
}

function symbol(id) {
    var s = {};
    s.id = s.value = id;
    s.nud = function() { return this };
    parser.symbols.define(s);
    return s;
}

symbol("(string)");
symbol("(end)");
symbol("**");