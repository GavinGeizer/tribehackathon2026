import { afterEach, expect, test } from 'bun:test';
import { createDemoProject } from '../../frontend/src/domain/seed';
import { loadProjects, saveProjects, clearStoredProjects, STORAGE_KEY } from '../../frontend/src/domain/storage';
const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
function setup() { const values=new Map<string,string>(); Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)}}); return values; }
afterEach(()=>{if(original)Object.defineProperty(globalThis,'localStorage',original);else Reflect.deleteProperty(globalThis,'localStorage');});
test('first visit demo persists edited facts across reload',()=>{setup();const p=loadProjects()[0];p.details.heritageProperty=true;saveProjects([p]);expect(loadProjects()[0].details.heritageProperty).toBe(true);});
test('corrupt nested state fails visibly and preserves the saved bytes',()=>{const values=setup(); const p=createDemoProject(); (p.documents[0] as any).fields=null; const raw=JSON.stringify([p]);values.set(STORAGE_KEY,raw);expect(()=>loadProjects()).toThrow('invalid');expect(values.get(STORAGE_KEY)).toBe(raw);});
test('invalid JSON and oversized projects never silently overwrite saved data',()=>{const values=setup(); values.set(STORAGE_KEY,'broken');expect(()=>loadProjects()).toThrow('preserved');expect(()=>saveProjects(Array.from({length:11},()=>createDemoProject()))).toThrow();expect(values.get(STORAGE_KEY)).toBe('broken');});
test('quota errors are explicit',()=>{setup();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{throw new Error('quota');}}});expect(()=>saveProjects([createDemoProject()])).toThrow('not saved');});

test('saving a new valid project cannot overwrite corrupt existing state',()=>{const values=setup();values.set(STORAGE_KEY,'broken');expect(()=>saveProjects([createDemoProject()])).toThrow('preserved');expect(values.get(STORAGE_KEY)).toBe('broken');});

test('explicit reset clears corrupt saved data and permits a fresh valid save',()=>{const values=setup();values.set(STORAGE_KEY,'broken');clearStoredProjects();expect(values.has(STORAGE_KEY)).toBe(false);saveProjects([createDemoProject()]);expect(loadProjects()).toHaveLength(1);});
