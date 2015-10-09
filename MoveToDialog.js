/*jslint vars: true, plusplus: true, devel: true, nomen: true,  regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    var Dialogs                = brackets.getModule("widgets/Dialogs");
    var DefaultDialogs         = brackets.getModule("widgets/DefaultDialogs");
    var EditorManager          = brackets.getModule("editor/EditorManager");
    var ProjectManager         = brackets.getModule("project/ProjectManager");
    var CommandManager         = brackets.getModule("command/CommandManager");
    var Commands               = brackets.getModule("command/Commands");
    var LiveDevMultiBrowser    = brackets.getModule("LiveDevelopment/LiveDevMultiBrowser");
    var KeyEvent               = brackets.getModule("utils/KeyEvent");
    var StartupState           = brackets.getModule("bramble/StartupState");
    var Filer                  = brackets.getModule("filesystem/impls/filer/BracketsFiler");
    var Path                   = Filer.Path;

    var MoveUtils              = require("MoveUtils");
    var dialogTemplate         = require("text!htmlContent/move-to-dialog.html");
    var directoryTreeTemplate  = require("text!htmlContent/directory-tree.html");
    Mustache.parse(dialogTemplate);
    Mustache.parse(directoryTreeTemplate);

    var BASE_INDENT        = 20;

    function _finishMove(source, destination, newPath) {
        var fileInEditor = EditorManager.getActiveEditor().getFile().fullPath;
        var relPath = Path.relative(source, fileInEditor);
        if(relPath === '') {
            relPath = Path.basename(fileInEditor);
        }
        var fileToOpen = Path.join(destination, relPath);

        ProjectManager.refreshFileTree();

        // Reload the editor if the current file that is in the
        // editor is a) what is being moved or b) is somewhere in
        // in the folder that is being moved.
        if(fileInEditor.indexOf(source) === 0) {
            CommandManager.execute(Commands.CMD_OPEN, {fullPath: fileToOpen});
        }

        LiveDevMultiBrowser.reload();
    }

    function _failMove(source, destination, error) {
        var from = Path.basename(source);
        var to = Path.basename(destination);

        if(error.type === MoveUtils.NEEDS_RENAME) {
            Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,
                "Move Error",
                "A file or folder with the name " + from + " already exists in " + to + ". Consider renaming either one to continue.");
            return;
        }

        Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,
            "Move Error",
            "An unexpected error occurred when attempting to move " + from + " to " + to);

        console.error("[Bramble] Failed to move `", source, "` to `", destination, "` with: ", error);
    }

    function _handleDialogEvents(dialog) {
        $(window.document.body).one("keyup.installDialog", function(e) {
            if(e.keyCode === KeyEvent.DOM_VK_ESCAPE) {
                dialog.close();
            }
        });

        dialog.getElement().one("buttonClick", function(e, button) {
            if(button === Dialogs.DIALOG_BTN_CANCEL) {
                return dialog.close();
            }

            if(button !== Dialogs.DIALOG_BTN_OK) {
                return;
            }

            var $directories = $(".move-to-dialog .directories");
            var source = $directories.attr("data-source");
            var destination = $directories.attr("data-destination");

            MoveUtils.move(source, destination)
            .done(_finishMove.bind(null, source, destination))
            .fail(_failMove.bind(null, source, destination))
            .always(function() {
                dialog.close();
            });
        });
    }

    function _handleClicksOnDirectories(pathToMove) {
        var $directories = $(".move-to-dialog .directories");

        $(".move-to-dialog .directory-name")
        .mousedown(function(e) {
            $(e.currentTarget).addClass("active-directory");
        })
        .click(function(e) {
            var $selectedDirectory = $(e.currentTarget);

            $(".move-to-dialog .directory-name").removeClass("active-directory");
            $directories.attr("data-destination", $selectedDirectory.parent().attr("data-path"));
            $selectedDirectory.addClass("active-directory");
        });
    }

    function _getListOfDirectories(defaultPath, callback) {
        var projectRoot = StartupState.project("root");
        var parentPath = projectRoot.replace("/?$", "");
        var directories = [{
            path: parentPath,
            name: "Project Root",
            children: false,
            indent: 0,
            noIcon: true,
            defaultPath: parentPath === defaultPath
        }];
        var currentIndent = 0;

        function constructDirTree(tree, currentNode, index) {
            if(currentNode.type !== "DIRECTORY") {
                return tree;
            }

            var currentPath = Path.join(parentPath, currentNode.path);
            var directory = {
                name: currentNode.path,
                path: currentPath,
                children: false,
                indent: currentIndent,
                defaultPath: currentPath === defaultPath
            };

            if(currentNode.contents && currentNode.contents.length > 0) {
                currentIndent += BASE_INDENT;
                parentPath = currentPath;
                directory.children = currentNode.contents.reduce(constructDirTree, false);
                parentPath = Path.dirname(currentPath);
                currentIndent -= BASE_INDENT;
            }

            tree = tree || [];
            tree.push(directory);
            return tree;
        }

        Filer.fs().ls(projectRoot, { recursive: true }, function(err, nodes) {
            if(err) {
                return callback(err);
            }

            callback(null, nodes.reduce(constructDirTree, directories));
        });
    }

    function open() {
        var context = ProjectManager.getContext();
        if(!context) {
            return;
        }
        var defaultPath = Path.dirname(context.fullPath);

        _getListOfDirectories(defaultPath, function(err, directories) {
            if(err) {
                return console.error("Failed to get list of directories with: ", err);
            }

            var dialogContents = {
                defaultPath: defaultPath,
                source: context.fullPath
            };
            var subdirectoryContents = {
                subdirectories: directoryTreeTemplate
            };
            var directoryContents = {
                directories: Mustache.render(directoryTreeTemplate, directories, subdirectoryContents)
            };

            var dialogHTML = Mustache.render(dialogTemplate, dialogContents, directoryContents);
            var dialog = Dialogs.showModalDialogUsingTemplate(dialogHTML, false);

            _handleDialogEvents(dialog);
            _handleClicksOnDirectories(context.fullPath);
        });
    }

    exports.open = open;
});
