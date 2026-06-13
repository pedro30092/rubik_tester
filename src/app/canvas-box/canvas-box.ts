import { Component, type OnInit } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-canvas-box',
  imports: [],
  templateUrl: './canvas-box.html',
  styleUrl: './canvas-box.scss',
})
export class CanvasBox implements OnInit {
  ngOnInit(): void {
    this.createThreeJsBox();
  }

  someMessage(): string {
    return 'Hello, World!';
  }

  createThreeJsBox(): void {
    // REVIEW this approach of using the DOM directly because is not the best practice in Angular,
    // but for the sake of simplicity and learning Three.js, we will go with it.
    const canvas = document.getElementById('canvas-box');

    //This "Scene" seems to be the main instance in which we will work.
    // Its like an "animation scene" and any new object will be add to the "scene"
    const scene = new THREE.Scene();

    // MeshToonMaterial is a material type that works as "CSS" to our 3D elements
    // Official documentations https://threejs.org/docs/index.html#LineBasicMaterial
    // https://threejs.org/manual/#en/materials
    const material = new THREE.MeshToonMaterial();

    //Sets the ligthing for our object
    const ambientLight = new THREE.AmbientLight('#FFFFFF', 0.5);
    scene.add(ambientLight);

    //This works
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.x = 2;
    pointLight.position.y = 2;
    pointLight.position.z = 2;
    scene.add(pointLight);

    const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), material);

    const torus = new THREE.Mesh(new THREE.TorusGeometry(5, 1.5, 16, 100), material);

    scene.add(torus, box);

    const canvasSizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const camera = new THREE.PerspectiveCamera(
      75,
      canvasSizes.width / canvasSizes.height,
      0.001,
      1000,
    );
    camera.position.z = 30;
    scene.add(camera);

    if (!canvas) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
    });
    renderer.setClearColor(0xe232222, 1);
    renderer.setSize(canvasSizes.width, canvasSizes.height);

    window.addEventListener('resize', () => {
      canvasSizes.width = window.innerWidth;
      canvasSizes.height = window.innerHeight;

      camera.aspect = canvasSizes.width / canvasSizes.height;
      camera.updateProjectionMatrix();

      renderer.setSize(canvasSizes.width, canvasSizes.height);
      renderer.render(scene, camera);
    });

    const clock = new THREE.Clock();

    const animateGeometry = () => {
      const elapsedTime = clock.getElapsedTime();

      // Update animation objects
      box.rotation.x = elapsedTime;
      box.rotation.y = elapsedTime;
      box.rotation.z = elapsedTime;

      torus.rotation.x = -elapsedTime;
      torus.rotation.y = -elapsedTime;
      torus.rotation.z = -elapsedTime;

      // Render
      renderer.render(scene, camera);

      // Call animateGeometry again on the next frame
      window.requestAnimationFrame(animateGeometry);
    };

    animateGeometry();
  }
}
