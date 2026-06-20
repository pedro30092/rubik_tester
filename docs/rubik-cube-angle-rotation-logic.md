# Cube rotating logic

Each rotateCube(axis, angle) rotates the entire cube holder around that world axis by that many radians. They fire simultaneously (different axes).

Starting state (default, white up):

### Up=White, Down=Yellow, Front=Red, Back=Orange, Right=Blue, Left=Green

After x: Math.PI (180° around X):
Flips the cube front-to-back vertically.

Up↔Down swap → Yellow up, White down
Front↔Back swap → Orange front, Red back
Left/Right unchanged → Blue right, Green left
After y: Math.PI (180° around Y, simultaneous):
Spins the cube half-turn around the vertical axis.

Front↔Back swap → Red front, Orange back
Left↔Right swap → Green right, Blue left
Combined result:

Up=Yellow, Down=White, Front=Red, Back=Orange, Right=Green, Left=Blue
So y: Math.PI essentially mirrors left/right and front/back from the X-flip result. If you want a quarter turn instead (90°), use Math.PI / 2 or -Math.PI / 2 to control which face comes forward.