var vows = require("vows"),
    assert = require("assert"),
    parser = require("../lib/parser.js");
    
vows.describe("Parser Tests").addBatch({
    "A symbol table": {
        topic: parser.symbols,
        
        "responds to define() and getToken()": function(symbols) {
            assert.isFunction(symbols.define);
            assert.isFunction(symbols.get_token);
        },
        "can define a fake symbol": function(symbols) {
            symbols.define({id:"(bogus)"});
            assert.equal(symbols.table["**"].id, "**");
        },
        "can get a bogus symbol once it is defined": function(symbols) {
            var t_bogus = symbols.get_token({id: "(bogus)"});
            assert.equal(symbols.table["(string)"].id, "(string)");
        },
        "can get a bold token": function(symbols) {
            var t_bold = symbols.get_token({id: "**"});
            assert.equal(t_bold.id, "**");
        },
        "can create a string token": function(symbols) {
            var t_string = symbols.get_token({id: "(string)", value: "HELLOSKI"});
            assert.equal(t_string.id, "(string)");
            assert.equal(t_string.value, "HELLOSKI");
        }
    },
    "A token stream" : {
        topic: parser.token_stream,
        
        "can set a stream of tokens": function(stream) {
            assert.isFunction(stream.set);
            stream.set([{id:"(string)", value:"This is "}, {id:"**"}, {id:"(string)", value:"bold"}, {id:"**"}, {id:"(string)", value:" text"}]);
        },
        "where the first token is a string": function(stream) {
            var tok = stream.advance();
            assert.equal(tok.id, "(string)");
        },
        "where the second token is a bold token": function(stream) {
            var tok = stream.advance("(string)");
            assert.equal(tok.id, "**");
        },
        "where advancing to the end yields an (end) token": function(stream) {
            stream.advance();
            stream.advance();
            stream.advance();
            var tok = stream.advance();
            assert.equal(tok.id, "(end)");
        }
    }
}).export(module);