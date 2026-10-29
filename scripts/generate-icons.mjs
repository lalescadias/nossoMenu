// Dependency-free raster rendering of the application's code-native geometric icon.
import {deflateSync} from 'node:zlib';
import {writeFileSync} from 'node:fs';
function crc32(data){let crc=0xffffffff;for(const b of data){crc^=b;for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function chunk(name,data){const type=Buffer.from(name),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([type,data])));return Buffer.concat([size,type,data,crc]);}
for(const size of [192,512]){
 const raw=Buffer.alloc((size*4+1)*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const nx=x/size,ny=y/size,d=Math.hypot(nx-.56,ny-.5),fork=(Math.abs(nx-.22)<.018&&ny>.27&&ny<.75)||((Math.abs(nx-.16)<.014||Math.abs(nx-.28)<.014)&&ny>.27&&ny<.45)||(Math.abs(Math.hypot(nx-.22,ny-.43)-.06)<.016&&ny>.43);
  const color=(Math.abs(d-.22)<.022||fork)?[255,249,237,255]:[39,99,78,255];const index=y*(size*4+1)+1+x*4;color.forEach((v,i)=>raw[index+i]=v);
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 writeFileSync(new URL(`../frontend/public/icon-${size}.png`,import.meta.url),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
}
