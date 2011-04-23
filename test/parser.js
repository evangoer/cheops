var vows = require("vows"),
    assert = require("assert"),
    parser = require("../lib/parser.js");
    
vows.describe("Parser Tests").addBatch({
    "A parser has a symbol table": {
        topic: parser.symbols,
        
        "that responds to define() and getToken()": function(symbols) {
            assert.isFunction(symbols.define);
            assert.isFunction(symbols.getToken);
        },
        "that can define a fake bold symbol": function(symbols) {
            symbols.define({id:"**"});
            assert.equal(symbols.table["**"].id, "**");
        },
        "that can define a fake string symbol": function(symbols) {
            symbols.define({id:"(string)"});
            assert.equal(symbols.table["(string)"].id, "(string)");
        },
        "that can get a bold token": function(symbols) {
            var t_bold = symbols.getToken({id: "**"});
            assert.equal(t_bold.id, "**");
        },
        "that can get a string token": function(symbols) {
            var t_string = symbols.getToken({id: "(string)", value: "HELLOSKI"});
            assert.equal(t_string.id, "(string)");
            assert.equal(t_string.value, "HELLOSKI");
        }
    }
}).export(module);