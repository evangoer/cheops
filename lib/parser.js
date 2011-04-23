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
        if (stream.length <= 0) {
            return symbols.getToken({id:"(end)"});
        }
        //if (id && token.id !== id) {
        //    throw "ERROR: Expected token " + id;
        //}
        return parser.symbols.get_token(stream.shift());
    }
}
