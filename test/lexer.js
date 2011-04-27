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
        
        "converts 0s to 0s": function (lexer) {
            assert.equal(lexer.tabs_to_spaces(""), "");
        },
        "converts 7s to 7s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("       "), "       ");
        },
        "converts 9s to 9s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("         "), "         ");
        },
        "converts 1t to 8s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\t"), "        ");
        },
        "converts 2t to 16s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\t\t"), "                ");
        },
        "converts 1s1t to 8s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces(" \t"), "        ");
        },
        "converts 9s1t to 16s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("         \t"), "                ");
        },
        "converts 7s1t to 8s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("       \t"), "        ");
        },
        "converts 1t7s to 15s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\t       "), "               ");
        },
        "converts 1t9s1t to 24s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\t         \t"), "                        ")
        },
        "converts 1v1s1f1t to 8s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\v \f\t"), "        ");
        }
    },
    
    "The indent_token function": {
        topic: lexer,
        
        "converts 4 leading spaces to a length 4 indent token": function(lexer) {
            var token = lexer.indent_token("    X ");
            assert.equal(token.id, "(indent)");
            assert.equal(token.value, 4);
        },
        "converts 0 leading spaces to a length 0 indent token": function(lexer) {
            var token = lexer.indent_token("X   X ");
            assert.equal(token.id, "(indent)");
            assert.equal(token.value, 0);
        },
        "converts a leading '\\f \\t\\v' to a length 9 indent token": function(lexer) {
            var token = lexer.indent_token("\f \t\vX ");
            assert.equal(token.id, "(indent)");
            assert.equal(token.value, 9);
        }
    }
    
}).export(module);
