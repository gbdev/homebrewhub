## Notes

Notes, todos and random notes about the project

#### @dovuro on `gamepad.supportsDiagonal`

@avivace I never documented this property, so just writing a bit here:

supportsDiagonal configures whether or not the D-Pad allows holding vertical and diagonal inputs at the same time for "diagonal" inputs. Imagine if you press your thumb on the "right" input, and then slide it towards the "up" input, passing through the empty space between them. If supportsDiagonal is false, then the D-Pad state will switch instantaneously from "right" to "up", without ever sending a "right + up" state. If supportsDiagonal is true, then the D-Pad will start as "right", then transition to "right + up", and then finally switch to "up".

In some games (like my Snake and Bubble Factory games) all movement and menu manipulation is orthogonal, so diagonal input isn't necessary. But games like Link's Awakening allow you to move diagonally, so you want to be able to send diagonal input.

Because touch is less precise than tactile buttons, preventing diagonal inputs in games that don't require them helps avoid accidental incorrect inputs. But because some games support diagonal input, I think the default should be to set this property to true. If you want to allow games to configure in their database entry whether or not they support diagonal input, you could configure this property based on that setting, but otherwise I think setting supportsDiagonal to true is the better default.
