# Learning

I want to have an easy and interactive way of reaching an algorithm to practice the physical mechanism (movement) and be more agile and fast in the real life (generate muscular memory). The main objective is to be competitive good to finish it the faster I can.

NOTE: Only Fridich  reduced

1. Menu selection

I can select different methods to solve a cube (Fridich reduced)

2. Show the side bar to the right with certain buttons.

- This shall be a new component that shows the 40% of the screen to the right of the cube. In other words I required to see the 2 components (its something like show a side bar with some specific buttons interactions).

NOTE: All buttons shall have a cool simple design (similar to a "game", maybe we can create simple interaction with three.js but let's review if this can be feasible). Some buttoms might required an small cleared hd image (possibly even better a simple "small" rubik cube [possibly small instances of rubik code] WITH CERTAIN FACES with certain colors, this means config to apply certain faces a certain amount of colors) inside those "buttons".

3. Side Panel Options sections

a) Settings

This section will have TBD components to handle custom behaviour such as speed of movements of the rubik cube, which colors to show as initial faces (for example Yellow face up, blue on the "left" when left is just the front face and red is the "right").

b) Algorithms

This sections will have the buttons or small cards with the "specific" type/content that will follows a wofklow. See step 4

4. Algorithms Workflow

The steps are the first options to select. Remember this might be related to a flow or tree like approach, this means we are going to have some nested components or options inside other, the root options are:

a) Crux
b) F2L
name: First Two Layers
c) OLL
name: Orient Last Layer
d) PLL
name: Permutate Last Layer

These are the type "Step". They dont need images, just a clear Acronym or letter to select them. When select them we should load their nested config.

NOTE: For now we will focus on the F2L.

F2L has the next nested options:

b.1) Basic
b.2) White Lateral
b.3) White Up

These are the type "Category", they dont need images.

NOTE: For now we will focus on the "Basic".

Basic has the next nested options:

b.1.1) Algorithm_A
b.1.2) Algorithm_B
b.1.3) Algorithm_C
b.1.4) Algorithm_D

These are the type "algorithm" and requires a small animation of the rubik cube. Each Algorithm (and fromm other categories or steps) will have their own configuration to show.

Digging more deeper on the algorithm animation. It would be good to have it created some kind of dynamic cube with the next characteristics:
- It should fit to a certain "card" or box to be shown in a small different, for example if the rubik cube main created was the 100%, then I would like the 15 percent as the animation.
- The advantages of using animation is that programatically we can generate a certain pattern with CERTAIN Colors (used from config values but for now default is the one mentioned before) and using custom behaviour for maximun learning performance.
- The config of the algorithms will have a lot of set up to handle the required functionality, but essentially we will have a series of notations, and naturally ITS reversed algorithm for further uses

NOTE: For now we will focus on Algorithm_A

5. Algorithm selection

When an Algorithm is selected the cube automatically will change for that selection. The details will be review later because one of the reason is that I want a simple "pop up" of the algorithm "selected" to be reflected on the main rubik cube, But behind the scene I would like to reuse the current logic similar to this code

  moveRight(): void {
    // Sexy move: U' F' U F
    this.controls.applyAlgorithm(["U'", "F'", 'U', 'F']);
  }

For example, if I select algorithm_A, I want that programatically I would "reset" the cube" AND then APPLY an algorithm INVERSED (from the config of the algorithm).