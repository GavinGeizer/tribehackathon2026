import { z } from 'zod';
import { createDemoProject } from './seed';
import type { Project } from './types';
export const STORAGE_KEY='permitpath.projects.v1';
const text=z.string(); const date=z.iso.datetime();
const documentTypes=z.enum(['construction_plan','elevations','professional_architectural','professional_electrical','professional_mechanical','professional_structural','professional_plumbing','professional_fire','professional_geotechnical','energy_letter','energy_checklist','heritage_photos','highway_approval','existing_conditions','project_description','other']);
const field=z.object({value:text,evidence:text,page:z.number().int().positive().optional(),method:z.enum(['explicit_label','model'])});
const document=z.object({id:text.min(1),name:text.min(1),size:z.number().nonnegative().finite(),uploadedAt:date,documentType:documentTypes,text:text.max(150000),pages:z.number().int().min(0).max(60),fields:z.record(text,field),method:z.enum(['deterministic','model']),uncertainties:z.array(text),warnings:z.array(text),synthetic:z.boolean().optional(),userConfirmedType:z.boolean().optional()});
const details=z.object({address:text.trim().min(1),description:text,proposedArea:z.number().finite().nonnegative().nullable(),storeys:z.number().int().positive().nullable(),externalWalls:z.boolean().nullable(),onHrmRoad:z.boolean().nullable(),rightOfWayWork:z.boolean().nullable(),heritageProperty:z.boolean().nullable(),energyDocument:z.enum(['hrm_checklist','other']).nullable()});
const jurisdiction=z.object({province:z.literal('NS'),municipality:z.enum(['hrm','cbrm','truro','kentville','bridgewater','other_ns']),municipalityName:text.trim().min(1).max(150),customerType:z.enum(['individual','independent_contractor','small_company','medium_company','enterprise']),workflow:z.enum(['commercial-renovation','manual'])});
const renewal=z.object({createdAt:date,approvedAt:date.nullable(),status:z.enum(['needs_review','approved_for_manual_handoff']),eligibility:z.literal('unverified'),note:text.max(5000)});
const permit=z.object({status:z.enum(['preparing','ready_for_review','submitted_manually','issued','closed']),reference:text.max(120),issuedOn:z.iso.date().nullable(),expiresOn:z.iso.date().nullable(),expirySource:text.max(1000),reminderDays:z.array(z.number().int().min(1).max(365)).max(6),remindersEnabled:z.boolean(),renewal:renewal.nullable()});
const forms=z.object({sewagePath:z.enum(['approval','notification']).nullable().optional(),answers:z.object({professionalDesign:z.boolean().nullable().optional(),fuelGasWork:z.boolean().nullable().optional(),onsiteSewage:z.boolean().nullable().optional()}),drafts:z.record(z.string().max(150),z.object({values:z.record(z.string().max(500),z.union([z.string().max(10000),z.boolean()])).refine(v=>Object.keys(v).length<=500),updatedAt:date,reviews:z.record(z.string().max(500),z.object({value:z.string().max(10000),source:z.string().max(1500),quote:z.string().max(12000),method:z.enum(['model','deterministic']),at:date})).optional()})).refine(v=>Object.keys(v).length<=30)});
const project=z.object({id:text.min(1),name:text.trim().min(1),contractor:text,client:text,details,documents:z.array(document).max(20),acknowledgements:z.array(z.object({requirementId:text,note:text,at:date})),activity:z.array(z.object({id:text,at:date,message:text})),createdAt:date,updatedAt:date,synthetic:z.boolean(),jurisdiction:jurisdiction.optional(),permit:permit.optional(),forms:forms.optional()});
const projectsSchema=z.array(project).max(10).superRefine((projects,ctx)=>{
 if(new Set(projects.map(p=>p.id)).size!==projects.length) ctx.addIssue({code:'custom',message:'Project IDs must be unique.'});
 for(const p of projects) if(new Set(p.documents.map(d=>d.id)).size!==p.documents.length) ctx.addIssue({code:'custom',message:'Document IDs must be unique within each project.'});
});
function validate(value:unknown):Project[] {
 const parsed=projectsSchema.safeParse(value); if(!parsed.success) throw new Error('Saved project data is invalid or exceeds project/document limits. Existing browser data has been preserved. Export or clear it explicitly before resetting.');
 const total=parsed.data.reduce((sum,p)=>sum+p.documents.reduce((n,d)=>n+new TextEncoder().encode(d.text).length,0),0);
 if(total>3*1024*1024) throw new Error('Extracted document text exceeds the 3 MiB browser storage limit. Remove documents before saving.');
 return parsed.data;
}
export function loadProjects():Project[] {
 if(typeof localStorage==='undefined') return [createDemoProject()];
 let raw:string|null; try {raw=localStorage.getItem(STORAGE_KEY);} catch {throw new Error('Browser storage is unavailable. Allow browser storage to retain projects.');}
 if(raw===null) return [createDemoProject()];
 let value:unknown; try {value=JSON.parse(raw);} catch {throw new Error('Saved project data could not be read. Existing browser data has been preserved. Clear it explicitly to reset.');}
 return validate(value);
}
export function saveProjects(projects:Project[]):void {
 const parsed=validate(projects);
 if(typeof localStorage==='undefined') throw new Error('Browser storage is unavailable. Projects were not saved.');
 let existing:string|null; try {existing=localStorage.getItem(STORAGE_KEY);} catch {throw new Error('Browser storage is unavailable. Projects were not saved.');}
 if(existing!==null) {
  let value:unknown; try {value=JSON.parse(existing);} catch {throw new Error('Existing saved data is corrupt and has been preserved. Explicitly clear browser project data before saving a replacement.');}
  validate(value);
 }
 try {localStorage.setItem(STORAGE_KEY,JSON.stringify(parsed));} catch {throw new Error('Browser storage is full or unavailable. Projects were not saved; remove documents or export a report before retrying.');}
}

/** Explicit reset only: callers must expose the destructive effect to the user. */
export function clearStoredProjects():void {
 if(typeof localStorage==='undefined') throw new Error('Browser storage is unavailable. Stored projects were not cleared.');
 try {localStorage.removeItem(STORAGE_KEY);} catch {throw new Error('Browser storage could not be cleared. Existing project data has been preserved.');}
}
