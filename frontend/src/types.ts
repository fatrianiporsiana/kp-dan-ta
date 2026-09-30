export type Role='mahasiswa'|'dosen_pembimbing'|'dosen_penguji'|'kaprodi'|'sekprodi'|'staff';
export type Mod='kp'|'ta';
export type Status='NONE'|'PENDING'|'IN_REVIEW'|'REJECTED'|'APPROVED'|'COMPLETED';
export interface User{id:number;name:string;email:string;nim?:string;roles:Role[]}
export interface Item{status:Status;note?:string;data?:Record<string,string>}
export interface Notif{id:number;text:string;read:boolean}
export interface Db{reg:Item;c1:Item;c2:Item;ext:Item;notifs:Notif[]}
