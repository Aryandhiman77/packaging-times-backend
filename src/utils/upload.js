import multer from 'multer';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
const MAX_BYTES=10*1024*1024;
const mimeList=['image/png','image/jpeg','image/webp','image/gif'];
export const oneImage=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_BYTES,files:1,fields:18},fileFilter:(req,file,done)=>{
 if(!mimeList.includes(file.mimetype))return done(Object.assign(new Error('Only PNG, JPG, WEBP and GIF are allowed.'),{status:415}));done(null,true);
}}).single('image');
function inspect(buffer){
 if(buffer.length>=45&&buffer.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))){
  let cursor=8,seenHeader=false;
  while(cursor+12<=buffer.length){const size=buffer.readUInt32BE(cursor);const type=buffer.toString('ascii',cursor+4,cursor+8);if(size>buffer.length-cursor-12)return null;
   if(!seenHeader){if(type!=='IHDR'||size!==13)return null;seenHeader=true;}
   cursor+=size+12;if(type==='IEND')return size===0&&cursor===buffer.length?'png':null;
  }return null;
 }
 if(buffer.length>=8&&buffer.subarray(0,3).equals(Buffer.from('ffd8ff','hex'))&&buffer.subarray(-2).equals(Buffer.from('ffd9','hex')))return 'jpg';
 if(buffer.length>=20&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP'&&buffer.readUInt32LE(4)+8===buffer.length)return 'webp';
 if(buffer.length>=14&&['GIF87a','GIF89a'].includes(buffer.toString('ascii',0,6))&&buffer[buffer.length-1]===0x3b)return 'gif';
 return null;
}
export async function saveImage(file){if(!file)return null;const ext=inspect(file.buffer);if(!ext||file.mimetype!==({png:'image/png',jpg:'image/jpeg',webp:'image/webp',gif:'image/gif'})[ext])throw Object.assign(new Error('The uploaded image format or content is not valid.'),{status:415});
 const name=`${randomUUID()}.${ext}`;const folder=path.resolve('uploads');await mkdir(folder,{recursive:true});await writeFile(path.join(folder,name),file.buffer,{flag:'wx'});return `/uploads/${name}`;}
export async function deleteImage(imageUrl){if(!imageUrl?.startsWith('/uploads/'))return;const basename=path.basename(imageUrl);if(basename!==imageUrl.slice('/uploads/'.length))return;try{await unlink(path.resolve('uploads',basename));}catch(e){if(e.code!=='ENOENT')console.warn(e.message);}}
export const fileLimitBytes=MAX_BYTES;
