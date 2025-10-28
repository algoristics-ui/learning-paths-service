import { NextResponse } from 'next/server';
export function GET(){ return NextResponse.json({ name:'learning-paths-service', version:'0.1.0' }); }