/*jslint vars: true, plusplus: true, devel: true, nomen: true,  regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    var BracketsFiler   = brackets.getModule("filesystem/impls/filer/BracketsFiler");
    var BlobUtils       = brackets.getModule("filesystem/impls/filer/BlobUtils");
    var Path            = BracketsFiler.Path;

    var NEEDS_RENAME    = "needs rename";

    function move(src, dest) {
        var deferred = new $.Deferred();
        var fs = BracketsFiler.fs();
        src = src.replace("/?$", "");
        dest = dest.replace("/?$", "");
        var srcNodeName = Path.basename(src);

        if(src === dest || Path.dirname(src) === dest) {
            return deferred.resolve();
        }

        fs.readdir(dest, function(err, contents) {
            if(err) {
                return deferred.reject(err);
            }

            if(contents.indexOf(srcNodeName) !== -1) {
                return deferred.reject({ type: NEEDS_RENAME });
            }

            fs.mv(src, dest, function(err) {
                if(err) {
                    return deferred.reject(err);
                }

                BlobUtils.preload(dest, function(err) {
                    if(err) {
                        return deferred.reject(err);
                    }

                    fs.rm(src, {recursive: true}, function(err) {
                        if(err) {
                            return deferred.reject(err);
                        }

                        return deferred.resolve(dest);
                    });
                });
            });
        });

        return deferred;
    }

    exports.move             = move;
    exports.NEEDS_RENAME     = NEEDS_RENAME;
});
