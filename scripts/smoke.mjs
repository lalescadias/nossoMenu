import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
const base=process.env.SMOKE_URL||'http://localhost:8088';
const stateFile=new URL('../.tools/smoke-state.json',import.meta.url);
class Client{
 cookies=new Map();csrf='';
 async request(path,method='GET',body,expected=200){
  if(method!=='GET'&&!this.csrf){this.csrf=(await this.request('/auth/csrf')).token;}
  const response=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; '),...(method!=='GET'?{'X-XSRF-TOKEN':this.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  for(const cookie of response.headers.getSetCookie()){const first=cookie.split(';')[0],index=first.indexOf('=');this.cookies.set(first.slice(0,index),first.slice(index+1));}
  const text=await response.text();assert.equal(response.status,expected,`${method} ${path}: ${response.status} ${text.slice(0,250)}`);return text?JSON.parse(text):null;
 }
}
if(process.argv.includes('--verify-restart')){
 const state=JSON.parse(await readFile(stateFile,'utf8')),client=new Client();await client.request('/auth/login','POST',{email:state.email,password:state.password});const list=await client.request('/shopping-lists/'+state.listId);assert.ok(list.items.some(i=>i.id===state.itemId&&i.purchased));assert.ok(list.items.some(i=>i.name==='Detergente de teste'));await unlink(stateFile);console.log('PASS: dados e compras preservados após reiniciar o backend e voltar a entrar.');
}else{
 const suffix=randomBytes(6).toString('hex'),password=randomBytes(24).toString('base64url'),alice=new Client(),bob=new Client(),outside=new Client();
 const email=`smoke-${suffix}@example.invalid`;await alice.request('/auth/register','POST',{name:'Teste de persistência',email,password});await bob.request('/auth/register','POST',{name:'Teste de partilha',email:`bob-${suffix}@example.invalid`,password});await outside.request('/auth/register','POST',{name:'Teste de isolamento',email:`outside-${suffix}@example.invalid`,password});
 const invitation=await alice.request('/families/current/invitations','POST',{email:`bob-${suffix}@example.invalid`});await bob.request('/invitations/accept','POST',{token:invitation.token});
 const menu=await alice.request('/menus/generate','POST',{weekStart:'2026-11-02',replace:false});assert.equal(menu.meals.length,14);const recipes=await alice.request('/recipes');assert.ok(recipes.length>=18);
 const list=await alice.request('/shopping-lists/from-menu','POST',{name:'Teste de compras persistentes',menuId:menu.id});await outside.request('/shopping-lists/'+list.id,'GET',undefined,404);await bob.request('/shopping-lists/'+list.id);
 const manual=await alice.request(`/shopping-lists/${list.id}/items`,'POST',{name:'Detergente de teste',category:'Limpeza',quantity:2,unit:'un',purchased:false});
 const streamController=new AbortController();const stream=await fetch(base+'/api/events',{headers:{Cookie:[...alice.cookies].map(([k,v])=>`${k}=${v}`).join('; ')},signal:streamController.signal});assert.equal(stream.status,200);const reader=stream.body.getReader();await reader.read();
 const item=list.items[0];await bob.request(`/shopping-lists/${list.id}/items/${item.id}`,'PATCH',{...item,purchased:true});const event=await Promise.race([reader.read(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('SSE timeout')),5000))]);assert.ok(new TextDecoder().decode(event.value).includes('changed'));streamController.abort();await reader.cancel().catch(()=>{});await alice.request(`/shopping-lists/${list.id}/items/${item.id}`,'PATCH',{...item,purchased:false},409);
 const before=await alice.request('/shopping-lists/'+list.id);const dinner=menu.meals.find(m=>m.type==='DINNER');const replacement=recipes.find(r=>r.recipe.id!==dinner.recipeId).recipe;
 await alice.request(`/menus/${menu.id}/meals/${dinner.id}`,'PUT',{recipeId:replacement.id,servings:dinner.servings,version:menu.version});const unchanged=await alice.request('/shopping-lists/'+list.id);assert.deepEqual(unchanged.items,before.items);
 const preview=await alice.request(`/shopping-lists/${list.id}/preview-sync`,'POST');await alice.request(`/shopping-lists/${list.id}/apply-sync`,'POST',{token:preview.token});const final=await bob.request('/shopping-lists/'+list.id);assert.ok(final.items.some(i=>i.id===manual.id&&i.quantity===2));assert.ok(final.items.some(i=>i.id===item.id&&i.purchased));
 const logs=await alice.request('/activity');assert.ok(logs.some(l=>l.userName==='Teste de partilha'&&l.action==='ITEM_PURCHASED'));
 const docs=await alice.request('/docs');assert.ok(docs.paths['/api/shopping-lists/{id}/apply-sync']);
 await mkdir(new URL('../.tools/',import.meta.url),{recursive:true});await writeFile(stateFile,JSON.stringify({email,password,listId:list.id,itemId:item.id}));
 console.log('PASS: autenticação real com CSRF, 2 membros, isolamento, 18 receitas, 14 refeições, compras, conflitos, sincronização manual, auditoria e OpenAPI.');
}
