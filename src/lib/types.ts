export type Scope = 'demo' | 'manual';
export type TrainType = 'normal' | 'highspeed' | 'other';
export type EventKind = 'arrival' | 'departure' | 'pass';
export type PathStatus = 'confirmed' | 'unique' | 'ambiguous' | 'insufficient' | 'excluded';
export interface Node { id:string; name:string; lat:number; lng:number; }
export interface Segment { id:string; name:string; from:string; to:string; geometry:[number,number][]; km:number; directions:string[]; source:string; }
export interface Point { id:string; name:string; segmentId:string; fraction:number; lat:number; lng:number; status:'confirmed'|'candidate'; inboundMinutes?:number; outboundMinutes?:number; }
export interface Stop { nodeId:string; sequence:number; arrival?:string; departure?:string; arrivalDay?:number; departureDay?:number; }
export interface EventEstimate { nodeId:string; kind:'arrival'|'departure'; time:string; source:string; updatedAt:string; expiresAt:string; }
export interface Train { id:string; code:string; aliases?:string[]; type:TrainType; originDate:string; stops:Stop[]; path:string[]; pathStatus:PathStatus; pathBasis:string; source:string; updatedAt:string; eventEstimates?:EventEstimate[]; }
export interface Observation { id:string; scope:Scope; pointId:string; trainId?:string; time:string; direction:string; type:'passenger'|'freight'|'unknown'; note:string; createdAt:string; }
export interface Calibration { id:string; scope:Scope; pointId:string; direction:string; type:TrainType; offsetMinutes:number; spreadMinutes:number; samples:number; applied:boolean; }
export interface Dataset { scope:Scope; nodes:Node[]; segments:Segment[]; points:Point[]; trains:Train[]; observations:Observation[]; calibrations:Calibration[]; refreshedAt:string; }
export interface Prediction { id:string; trainId:string; code:string; type:TrainType; targetId:string; targetKind:'station'|'segment'|'point'; event:EventKind|'crossing'; start:string; end:string; direction:string; method:string; explanation:string; anchors:string[]; pathStatus:PathStatus; confidence:'较高'|'一般'|'较低'; source:string; updatedAt:string; calibrationSamples:number; }
