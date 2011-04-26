var vows = require("vows"),
    assert = require("assert"),
    lexer = require("../lib/lexer.js");
    
vows.describe("Lexer Tests").addBatch({
    "The inline_token function": {
        topic: lexer,
        
        "creates a token when supplied with a match": function(lexer) {
            var matches = /(a)|(b)/.exec("cacbc");
            var token = lexer.inline_token(matches);
            assert.equal(token.id, "a");
            assert.equal(token.value, "a");
        },
        "creates the right token if the nth group is captured": function(lexer) {
            var matches = /(a)|(b)/.exec("cccbc");
            var token = lexer.inline_token(matches);
            assert.equal(token.id, "b");
            assert.equal(token.value, "b");
        },
        "does not create a token when the input is null": function(lexer) {
            var matches = /(a)|(b)/.exec("c");
            assert.equal(lexer.inline_token(matches), undefined);
        },
        "does not create a token if all match elements are bogus": function(lexer) {
            var matches = [undefined, undefined];
            assert.equal(lexer.inline_token(matches), undefined);
        }
    },

    "The tabs_to_spaces function": {
        topic: lexer,
        
        "Converts 0s to 0s": function (lexer) {
            assert.equal(lexer.tabs_to_spaces(""), "");
        },
        "Converts 7s to 7s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("       "), "       ");
        },
        "Converts 9s to 9s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("         "), "         ");
        },
        "Converts 1t to 8s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\t"), "        ");
        },
        "Converts 2t to 16s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\t\t"), "                ");
        },
        "Converts 1s1t to 8s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces(" \t"), "        ");
        },
        "Converts 9s1t to 16s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("         \t"), "                ");
        },
        "Converts 7s1t to 8s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("       \t"), "        ");
        },
        "Converts 1t7s to 15s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\t       "), "               ");
        },
        "Converts 1t9s1t to 24s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\t         \t"), "                        ")
        },
        "Converts 1v1s1f1t to 8s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\v \f\t"), "        ");
        }
    }
}).export(module);
