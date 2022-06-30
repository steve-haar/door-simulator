import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();

export function getStandardMaterial(name: string, ext: string) {
  const textures = getTextures(name, ext);

  return new THREE.MeshStandardMaterial({
    map: textures.diffuse,
    normalMap: textures.normal,
    aoMap: textures.arm,
    roughnessMap: textures.arm,
    metalnessMap: textures.arm,
  });
}

function getTextures(name: string, ext: string) {
  return {
    diffuse: textureLoader.load(`/textures/${name}/diffuse.${ext}`),
    arm: textureLoader.load(`/textures/${name}/arm.${ext}`),
    normal: textureLoader.load(`/textures/${name}/normal.${ext}`),
  };
}
