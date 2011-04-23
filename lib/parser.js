var token,
    tokens = [{id:"(string)", value:"This is "}, {id:"**"}, {id:"(string)", value:"bold"}, {id:"**"}, {id:"(string)", value:" text"}];

var parser = exports;

parser.symbols = {
    table: {},
    define: function(sym) {
        this.table[sym.id] = sym;
    },
    getToken: function(tok) {
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