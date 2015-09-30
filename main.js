/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

define(function (require, exports, module) {
    "use strict";

    var CommandManager = brackets.getModule("command/CommandManager");
    var Commands       = brackets.getModule("command/Commands");
    var Menus          = brackets.getModule("command/Menus");

    var MOVE_FILE = "bramble-move-file.moveFile";
    var MOVE_FILE_LOCATION = "bramble-move-file.moveFileLocation";
    var MOVE_L1 = "bramble-move-file.moveL1";

    function move() {}

    CommandManager.register("Move To", MOVE_FILE, move);
    CommandManager.register("Success", MOVE_L1, move);
    CommandManager.register("Success 2", "bramble-testing", move);
    var menu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU);
    var menuItem = menu.addMenuItem(MOVE_FILE, null, Menus.AFTER, Commands.FILE_RENAME);
    var moveToMenu = Menus.registerContextMenu(MOVE_FILE_LOCATION);
    moveToMenu.addMenuItem(MOVE_L1);
    moveToMenu.addMenuItem("bramble-testing", null, Menus.AFTER, MOVE_L1);
    menuItem.registerSubMenu(moveToMenu);
});
