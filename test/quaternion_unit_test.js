import * as THREE from 'three';
import assert from 'assert';
// eslint-disable-next-line
import Quaternion from '../src/Renderer/ThreeExtended/Quaternion';
/* global describe, it */

describe('Quaternion', function () {
    it('should compute imprecise Quaternion.slerp with close values', () => {
        const angleA = Math.PI * 0.3330;
        const angleB = Math.PI * 0.3329;
        const A = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angleA);
        const B = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angleB);

        const slerp = 0.25;
        const R = A.clone().preciseSlerp(B, slerp);
        const O = A.clone().slerp(B, slerp);

        const F = new THREE.Euler().setFromQuaternion(R);
        const S = new THREE.Euler().setFromQuaternion(O);

        const result = (angleA * (1 - slerp)) + (angleB * (slerp));
        // eslint-disable-next-line
        console.log('Diff result with precise  : ', result - F.z, 'in degree, ', Math.sin(result - F.z) * 6378137, ' in meters on globe');
        // eslint-disable-next-line
        console.log('Diff result with original : ', result - S.z, 'in degree, ', Math.sin(result - S.z) * 6378137, ' in meters on globe');

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
