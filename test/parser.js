var vows = require("vows"),
    assert = require("assert"),
    parser = require("../lib/parser.js");
    
var ts_inline = [{id:"(string)", value:"This is "}, {id:"**"}, 
        {id:"(string)", value:"bold"}, {id:"**"}, {id:"(string)", value:" text."}];

var ts_paragraph = [{id:"paragraph"}].concat(ts_inline).concat([{id:"\n\n"}]);
    
vows.describe("Parser Tests").addBatch({
    "A symbol table": {
        topic: parser,
        
        "responds to define() and get_token()": function(parser) {
            assert.isFunction(parser.symbol);
            assert.isFunction(parser.get_token);
        },
        "can define a bogus symbol": function(parser) {
            var s_bogus = parser.symbol("(bogus)");
            assert.equal(s_bogus.id, "(bogus)");
        },
        "can get a bogus symbol once it is defined": function(parser) {
            var t_bogus = parser.get_token({id: "(bogus)"});
            assert.equal(t_bogus.id, "(bogus)");
        },
        "can get a predefined bold token": function(parser) {
            var t_bold = parser.get_token({id: "**"});
            assert.equal(t_bold.id, "**");
        },
        "can create a string token with a value": function(parser) {
            var t_string = parser.get_token({id: "(string)", value: "HELLOSKI"});
            assert.equal(t_string.id, "(string)");
            assert.equal(t_string.value, "HELLOSKI");
        }
    },
    "A token stream": {
        topic: parser,
        
        "can set a stream of tokens": function(parser) {
            assert.isFunction(parser.set_token_stream);
            parser.set_token_stream(ts_inline);
        },
        "where the first token is a string": function(parser) {
            var tok = parser.advance();
            assert.equal(tok.id, "(string)");
        },
        "where the second token is a bold token": function(parser) {
            var tok = parser.advance("(string)");
            assert.equal(tok.id, "**");
        },
        "where advancing to the end yields an (end) token": function(parser) {
            parser.advance();
            parser.advance();
            parser.advance();
            var tok = parser.advance();
            assert.equal(tok.id, "(end)");
        }
    }
}).addBatch({
    "A paragraph document tree": {
        topic: function() {
            parser.set_token_stream(ts_paragraph);
            parser.advance();
            return parser.parse();
        },
        "starts with a paragraph": function(tree) {
            assert.equal(tree.id, "paragraph");
            assert.equal(tree.value, "paragraph");
        },
        "which has three children": function(tree) {
            assert.length(tree.first, 3);
        },
        "where the first child is text": function(tree) {
            assert.equal(tree.first[0].id, "(string)");
            assert.equal(tree.first[0].value, "This is ");
        },
        "where the second child is bold": function(tree) {
            assert.equal(tree.first[1].id, "**");
            assert.equal(tree.first[1].value, "**");
            assert.equal(tree.first[1].first.id, "(string)");
            assert.equal(tree.first[1].first.value, "bold");
        },
        "where the third child is text": function(tree) {
            assert.equal(tree.first[2].id, "(string)");
            assert.equal(tree.first[2].value, " text.");
        },
    }
}).export(module);