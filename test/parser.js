var vows = require("vows"),
    assert = require("assert"),
    parser = require("../lib/parser.js");
    
vows.describe("Parser Tests").addBatch({
    "A parser": {
        topic: parser.hello(),
        
        "should have a hello() function that returns 'HELLOSKI'": function(topic) {
            assert.equal(topic, "HELLOSKI");
        }
    }
}).export(module);