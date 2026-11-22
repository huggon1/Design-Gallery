import * as THREE from './assets/vendor/three.module.js';
// Color precision and PSX dither follow the source port's GodotRetro CC0 shader.
// research/Dithering.gdshader preserves its source and attribution.
export function createPost(renderer){
 const target=new THREE.WebGLRenderTarget(1280,720,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,type:THREE.HalfFloatType});
 const material=new THREE.ShaderMaterial({uniforms:{image:{value:target.texture}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D image;varying vec2 vUv;void main(){gl_FragColor=texture2D(image,vUv);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 float luma=dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722));gl_FragColor.rgb=mix(vec3(luma),gl_FragColor.rgb,.26);int x=int(mod(gl_FragCoord.x,4.));int y=int(mod(gl_FragCoord.y,4.));float d=0.;if(y==0){if(x==0)d=-4.;if(x==1)d=0.;if(x==2)d=-3.;if(x==3)d=1.;}else if(y==1){if(x==0)d=2.;if(x==1)d=-2.;if(x==2)d=3.;if(x==3)d=-1.;}else if(y==2){if(x==0)d=-3.;if(x==1)d=1.;if(x==2)d=-4.;if(x==3)d=0.;}else{if(x==0)d=3.;if(x==1)d=-1.;if(x==2)d=2.;if(x==3)d=-2.;}gl_FragColor.rgb=max(vec3(0.),floor((gl_FragColor.rgb+d*.009)*10.)/10.);gl_FragColor.a=1.;}`});
 const screen=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);screen.add(quad);
 return {draw(scene,camera3d,w,h){if(target.width!==w||target.height!==h)target.setSize(w,h);renderer.setRenderTarget(target);renderer.render(scene,camera3d);renderer.setRenderTarget(null);renderer.render(screen,camera);},dispose(){target.dispose();quad.geometry.dispose();material.dispose();}};
}
