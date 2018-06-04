import * as THREE from 'three';
import assert from 'assert';
// eslint-disable-next-line
import Quaternion from '../src/Renderer/ThreeExtended/Quaternion';
/* global describe, it */

describe('Quaternion', function () {
    it('should compute imprecise Quaternion.slerp with close values', () => {
        const A = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.3330);
        const B = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.33299999);
        const R = A.clone().preciseSlerp(B, 0.00001);
        const O = A.clone().slerp(B, 0.00001);

        assert.notEqual(R.z, O.z);
        assert.notEqual(R.w, O.w);
    });
    it('should compute precise Quaternion.slerp with distant values', () => {
        const A = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.333);
        const B = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.332);
        const R = A.clone().preciseSlerp(B, 0.00001);
        const O = A.clone().slerp(B, 0.00001);

        assert.equal(R.z, O.z);
        assert.equal(R.w, O.w);
    });
});
