import "./style.css";
import * as THREE from "three";

import { Animation } from "./setup";
import { getStandardMaterial } from "./texture-loader";

(function () {
  type destination = {
    x: number;
    z: number;
    timestampStuck: number;
    isOutside: boolean;
  };

  const options = {
    peoplePerMinute: 60,
    peopleSpeed: 0.5,
    floorSize: 100,
    wallHeight: 5,
    doorWidth: 4,
    doorHeight: 3,
    doorDepth: 0.25,
  };

  const animation = new Animation(
    document.getElementsByTagName("canvas")[0],
    animationLoop
  );

  const visualMaterials = getVisualMaterials();

  const lights = getLights();
  animation.scene.add(...Object.values(lights));

  const floor = getFloor();
  animation.scene.add(floor);

  const walls = getWalls();
  animation.scene.add(...walls);

  const doors = getDoors();
  animation.scene.add(...doors);

  const people = new Map<THREE.Mesh, { mesh: THREE.Mesh; box: THREE.Box3 }>();
  let peopleCreated = 0;
  let peopleCreationTimestamp = 0;
  const personGeometry = new THREE.ConeGeometry(0.5, 1);

  setupDebugControls();
  animation.initialize();

  function animationLoop(clock: THREE.Clock) {
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    movePeople(deltaTime);
    createPeople(elapsedTime);
  }

  function setupDebugControls() {
    animation.debugControls.add(options, "peopleSpeed").min(0).max(100).step(1);

    animation.debugControls
      .add(options, "peoplePerMinute")
      .min(0)
      .max(6000)
      .step(1)
      .onChange(() => {
        peopleCreated = 0;
        peopleCreationTimestamp = animation.clock.getElapsedTime();
      });

    animation.debugControls
      .add(options, "wallHeight")
      .min(0)
      .max(50)
      .step(0.5)
      .onChange((value) => {
        walls.forEach((wall) => {
          wall.scale.setY(value);
          wall.updateMatrix();
          wall.position.y = value / 2;
        });
      });
  }

  function movePeople(deltaTime: number) {
    const movement = deltaTime * options.peopleSpeed;

    people.forEach(({ mesh, box }) => {
      const destinations: destination[] = mesh.userData["destinations"];
      const destination = destinations[0];

      if (destination) {
        const xLeft = destination.x - mesh.position.x;
        const zLeft = destination.z - mesh.position.z;
        const hypotenuse = Math.sqrt(xLeft * xLeft + zLeft * zLeft);
        const normalizedVector = {
          x: xLeft / hypotenuse,
          z: zLeft / hypotenuse,
        };

        if (Math.abs(xLeft) + Math.abs(zLeft) < 2) {
          if (destinations.length === 1) {
            animation.scene.remove(mesh);
            people.delete(mesh);
          } else {
            mesh.userData["destinations"] = destinations.slice(1);
          }
        } else {
          mesh.position.set(
            mesh.position.x + normalizedVector.x * movement,
            0.5,
            mesh.position.z + normalizedVector.z * movement
          );
          box.setFromObject(mesh);
        }
      }
    });
  }

  function createPeople(elapsedTime: number) {
    elapsedTime -= peopleCreationTimestamp;
    const rate = 60 / options.peoplePerMinute;
    const expectedPeople = Math.floor(elapsedTime / rate);
    const toCreate = expectedPeople - peopleCreated;
    peopleCreated += toCreate;

    for (let i = 0; i < toCreate; i++) {
      const mesh = getPerson();
      people.set(mesh, { mesh, box: new THREE.Box3().setFromObject(mesh) });
      animation.scene.add(mesh);
    }
  }

  function getPerson() {
    const randomDoors = doors.sort(() => 0.5 - Math.random());
    const mesh = new THREE.Mesh(
      personGeometry,
      visualMaterials.people[
        Math.floor(Math.random() * visualMaterials.people.length)
      ]
    );
    const entryDoor = randomDoors[0];
    const exitDoor = randomDoors[1];
    const entryOffset = entryDoor.userData["entryOffset"];
    const exitOffset = exitDoor.userData["exitOffset"];
    const rampOffset = entryDoor.userData["rampOffset"];

    mesh.position.set(
      entryDoor.position.x + entryOffset.x,
      0.5,
      entryDoor.position.z + entryOffset.z
    );

    mesh.userData["destinations"] = [
      {
        x: entryDoor.position.x + entryOffset.x - rampOffset.x,
        z: entryDoor.position.z + entryOffset.z - rampOffset.z,
        isOutside: true,
      },
      {
        x: exitDoor.position.x + exitOffset.x,
        z: exitDoor.position.z + exitOffset.z,
      },
    ];

    return mesh;
  }

  function getVisualMaterials() {
    const people = ["red", "green", "blue"].map((color) =>
      getStandardMaterial(`${color}-fabric`, "jpg")
    );

    const wall = getStandardMaterial("concrete-wall", "jpg");
    wall.side = THREE.DoubleSide;

    const door = getStandardMaterial("wood", "jpg");
    door.side = THREE.DoubleSide;

    const floor = getStandardMaterial("floor-tiles", "jpg");

    [floor.map, floor.normalMap, floor.aoMap].forEach((texture) => {
      texture.repeat.set(options.floorSize / 4, options.floorSize / 4);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    });

    return { people, wall, door, floor };
  }

  function getLights() {
    return {
      ambientLight: new THREE.AmbientLight(),
    };
  }

  function getFloor() {
    const geometry = new THREE.PlaneGeometry(
      options.floorSize,
      options.floorSize
    );

    const ground = new THREE.Mesh(geometry, visualMaterials.floor);

    ground.rotation.set(Math.PI * -0.5, 0, 0);
    ground.position.y = 0;

    return ground;
  }

  function getWalls() {
    const geometry = new THREE.PlaneGeometry(options.floorSize, 1);

    const walls = [
      {
        position: {
          x: 0,
          y: options.wallHeight / 2,
          z: -options.floorSize / 2,
        },
        rotation: { x: 0, y: 0, z: 0 },
      },
      {
        position: {
          x: options.floorSize / 2,
          y: options.wallHeight / 2,
          z: 0,
        },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
      },
      {
        position: {
          x: 0,
          y: options.wallHeight / 2,
          z: options.floorSize / 2,
        },
        rotation: { x: 0, y: 0, z: 0 },
      },
      {
        position: {
          x: -options.floorSize / 2,
          y: options.wallHeight / 2,
          z: 0,
        },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
      },
    ].map((wallOptions) => {
      const wall = new THREE.Mesh(geometry, visualMaterials.wall);

      wall.position.set(
        wallOptions.position.x,
        wallOptions.position.y,
        wallOptions.position.z
      );
      wall.scale.setY(options.wallHeight);
      wall.rotation.set(
        wallOptions.rotation.x,
        wallOptions.rotation.y,
        wallOptions.rotation.z
      );

      return wall;
    });

    return walls;
  }

  function getDoors() {
    const geometry = new THREE.BoxGeometry(
      options.doorWidth,
      options.doorHeight,
      options.doorDepth
    );

    const y = options.doorHeight / 2;
    const move = options.floorSize / 3;
    const max = options.floorSize / 2;
    const min = -max;
    const rotation = Math.PI / 2;

    return [
      {
        position: { x: min, y, z: -move },
        rotation: { x: 0, y: rotation, z: 0 },
        entryOffset: { x: 0, z: 1 },
        exitOffset: { x: 0, z: -1 },
        rampOffset: { x: -1, z: 0 },
      },
      {
        position: { x: min, y, z: 0 },
        rotation: { x: 0, y: rotation, z: 0 },
        entryOffset: { x: 0, z: 1 },
        exitOffset: { x: 0, z: -1 },
        rampOffset: { x: -1, z: 0 },
      },
      {
        position: { x: min, y, z: move },
        rotation: { x: 0, y: rotation, z: 0 },
        entryOffset: { x: 0, z: 1 },
        exitOffset: { x: 0, z: -1 },
        rampOffset: { x: -1, z: 0 },
      },

      {
        position: { x: max, y, z: -move },
        rotation: { x: 0, y: rotation, z: 0 },
        entryOffset: { x: 0, z: -1 },
        exitOffset: { x: 0, z: 1 },
        rampOffset: { x: 1, z: 0 },
      },
      {
        position: { x: max, y, z: 0 },
        rotation: { x: 0, y: rotation, z: 0 },
        entryOffset: { x: 0, z: -1 },
        exitOffset: { x: 0, z: 1 },
        rampOffset: { x: 1, z: 0 },
      },
      {
        position: { x: max, y, z: move },
        rotation: { x: 0, y: rotation, z: 0 },
        entryOffset: { x: 0, z: -1 },
        exitOffset: { x: 0, z: 1 },
        rampOffset: { x: 1, z: 0 },
      },

      {
        position: { x: -move, y, z: min },
        rotation: { x: 0, y: 0, z: 0 },
        entryOffset: { x: -1, z: 0 },
        exitOffset: { x: 1, z: 0 },
        rampOffset: { x: 0, z: -1 },
      },
      {
        position: { x: 0, y, z: min },
        rotation: { x: 0, y: 0, z: 0 },
        entryOffset: { x: -1, z: 0 },
        exitOffset: { x: 1, z: 0 },
        rampOffset: { x: 0, z: -1 },
      },
      {
        position: { x: move, y, z: min },
        rotation: { x: 0, y: 0, z: 0 },
        entryOffset: { x: -1, z: 0 },
        exitOffset: { x: 1, z: 0 },
        rampOffset: { x: 0, z: -1 },
      },

      {
        position: { x: -move, y, z: max },
        rotation: { x: 0, y: 0, z: 0 },
        entryOffset: { x: 1, z: 0 },
        exitOffset: { x: -1, z: 0 },
        rampOffset: { x: 0, z: 1 },
      },
      {
        position: { x: 0, y, z: max },
        rotation: { x: 0, y: 0, z: 0 },
        entryOffset: { x: 1, z: 0 },
        exitOffset: { x: -1, z: 0 },
        rampOffset: { x: 0, z: 1 },
      },
      {
        position: { x: move, y, z: max },
        rotation: { x: 0, y: 0, z: 0 },
        entryOffset: { x: 1, z: 0 },
        exitOffset: { x: -1, z: 0 },
        rampOffset: { x: 0, z: 1 },
      },
    ].map((doorOptions) => {
      const { position, rotation, entryOffset, exitOffset, rampOffset } =
        doorOptions;
      const door = new THREE.Mesh(geometry, visualMaterials.door);
      door.renderOrder = 1;
      door.position.set(position.x, position.y, position.z);
      door.rotation.set(rotation.x, rotation.y, rotation.z);
      door.userData["entryOffset"] = entryOffset;
      door.userData["exitOffset"] = exitOffset;
      door.userData["rampOffset"] = rampOffset;
      return door;
    });
  }

  function normalRandom(multiplier = 1) {
    return Math.random() * 2 * multiplier - 1;
  }
})();
