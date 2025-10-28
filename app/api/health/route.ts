import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
export async function GET(){ try{ await query('SELECT 1'); return NextResponse.json({ status:'ok' }); } catch(e:any){ return NextResponse.json({ status:'error', error:e.message }, { status:500 }); } }