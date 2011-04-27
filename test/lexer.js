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
    }, 
    
    "The string_token function": {
        topic: lexer,
        
        "converts a string token at a line's start": function(lexer) {
            var token = lexer.string_token("0123456789", 0, {index:7});
            assert.equal(token.id, "(string)");
            assert.equal(token.value, "0123456");
        },
        "trims leading whitespace when at a line's start": function(lexer) {
            var token = lexer.string_token("  23456789", 0, {index:7});
            assert.equal(token.id, "(string)");
            assert.equal(token.value, "23456");
        },
        "converts a string token from a line's middle": function(lexer) {
            var token = lexer.string_token("  23456789", 4, {index:7});
            assert.equal(token.id, "(string)");
            assert.equal(token.value, "456");
        },
        "converts a string token from a line's end": function(lexer) {
            var token = lexer.string_token("  23456789", 4);
            assert.equal(token.id, "(string)");
            assert.equal(token.value, "456789");
        },
        "returns null rather than an empty string token": function(lexer) {
            assert.equal(lexer.string_token("", 0, null));
        }
    },
    
    "The lex function": {
        topic: lexer,
        
        "returns an empty array for falsy input": function(lexer) {
            assert.deepEqual(lexer.lex(null), []);
        },
        "returns an indent token for an empty string": function(lexer) {
            var tokens = lexer.lex("");
            assert.deepEqual(tokens[0], {id: "(indent)", value: 0});
        },
        "returns two indent tokens for two empty lines": function(lexer) {
            var tokens = lexer.lex("\r\n"),
                ind = {id: "(indent)", value: 0},
                expected = [ind, ind];
            assert.deepEqual(tokens, expected);
        },
        "returns IND,STR,BOL,STR for bold text": function(lexer) {
            var tokens = lexer.lex("**a**"),
                ind = {id: "(indent)", value: 0},
                str = {id: "(string)", value: "a"},
                bol = {id: "**", value: "**"},
                expected = [ind, bol, str, bol];   
            assert.deepEqual(tokens, expected);
        },
        "returns IND,STR,ITA,STR for italic text": function(lexer) {
            var tokens = lexer.lex("*a*"),
                ind = {id: "(indent)", value: 0},
                str = {id: "(string)", value: "a"},
                bol = {id: "*", value: "*"},
                expected = [ind, bol, str, bol];   
            assert.deepEqual(tokens, expected);
        }
    }
    
    /*
    1. input.split (2 lines or 1)
    2. input is falsy
    3. at least one bold match
    4. at least one italic match
    5. string match only
    
    var pattern = /(\*\*|\*(?!\*))/g

    function lex(input) {
        var lines = input ? input.split(/\r?\n/) : {length:0},
            tokens = [],
            matches,
            last_index,
            str_token;

        for (var i = 0; i < lines.length; i += 1) {
            last_index = 0;
            tokens.push(indent_token(lines[i]));

            while ((matches = pattern.exec(lines[i])) !== null) {
                str_token = string_token(lines[i], last_index, matches);
                if (str_token) {
                    tokens.push(str_token);
                }
                // Save the index to start the next match for the next iteration,
                // as the start point for slicing out the next string token.
                last_index = pattern.lastIndex;

                tokens.push(inline_token(matches));
            }
            // after we are out of matches, get the last 
            tokens.push(string_token(lines[i], last_index));
        }
        return tokens;
    }
    */
    
    
    
}).export(module);
