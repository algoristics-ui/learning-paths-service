"use strict";(()=>{var e={};e.id=175,e.ids=[175],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},7261:e=>{e.exports=require("node:util")},891:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>E,patchFetch:()=>m,requestAsyncStorage:()=>g,routeModule:()=>l,serverHooks:()=>h,staticGenerationAsyncStorage:()=>_});var r={};s.r(r),s.d(r,{GET:()=>p});var a=s(9303),n=s(8716),o=s(670),i=s(7070),d=s(4328),u=s(7435),c=s(9178);async function p(e,{params:t}){try{let s=await (0,c.S)(e),r=parseInt(t.pathId);if(isNaN(r))return i.NextResponse.json({success:!1,error:{code:"VALIDATION_ERROR",message:"Invalid path ID"}},{status:400});u.k.info(`Fetching learning path details: userId=${s.userId}, organizationId=${s.organizationId}, pathId=${r}`);let a=`
      SELECT 
        lp.*,
        COALESCE(ue.status, 'not_started') as user_status,
        COALESCE(ue.progress, 0) as user_progress,
        COALESCE(ue.completed_courses, 0) as user_completed_courses,
        COALESCE(ue.enrolled_at, NULL) as enrolled_at,
        COALESCE(ue.last_activity, NULL) as last_activity
      FROM learning_paths lp
      LEFT JOIN user_enrollments ue ON lp.id = ue.path_id AND ue.user_id = $2
      WHERE lp.id = $1 AND lp.organization_id = $3
    `,n=await (0,d.I)(a,[r,s.userId,s.organizationId]);if(0===n.rows.length)return i.NextResponse.json({success:!1,error:{code:"NOT_FOUND",message:"Learning path not found"}},{status:404});let o=n.rows[0],p=(await (0,d.I)(`
      SELECT 
        m.*,
        json_agg(
          json_build_object(
            'id', c.id,
            'title', c.title,
            'duration', c.duration,
            'status', COALESCE(ucp.status, 'locked'),
            'orderIndex', c.order_index,
            'completedAt', ucp.completed_at
          ) ORDER BY c.order_index
        ) as courses
      FROM milestones m
      LEFT JOIN courses c ON m.id = c.milestone_id
      LEFT JOIN user_course_progress ucp ON c.id = ucp.course_id AND ucp.user_id = $2
      WHERE m.path_id = $1
      GROUP BY m.id, m.title, m.path_id, m.order_index
      ORDER BY m.order_index
    `,[r,s.userId])).rows.map(e=>({id:e.id,title:e.title,pathId:e.path_id,orderIndex:e.order_index,courses:e.courses||[]})),l=p.find(e=>e.courses.some(e=>"available"===e.status||"in_progress"===e.status))?.title||null,g={id:o.id,title:o.title,description:o.description,category:o.category,difficulty:o.difficulty,estimatedTime:o.estimated_time,totalCourses:o.total_courses,completedCourses:o.user_completed_courses,status:o.user_status,progress:o.user_progress,enrolledStudents:o.enrolled_students,rating:parseFloat(o.rating),instructor:o.instructor,skills:o.skills,nextMilestone:l,badges:o.badges,milestones:p,organizationId:o.organization_id,createdAt:o.created_at,updatedAt:o.updated_at};return u.k.info(`Learning path details fetched successfully: userId=${s.userId}, pathId=${r}, pathTitle=${g.title}`),i.NextResponse.json({success:!0,data:g})}catch(e){if(u.k.error(`Error fetching learning path details: ${e.message}, pathId=${t.pathId}`),"Missing Bearer token"===e.message||"Invalid token"===e.message)return i.NextResponse.json({success:!1,error:{code:"UNAUTHORIZED",message:e.message}},{status:401});return i.NextResponse.json({success:!1,error:{code:"INTERNAL_ERROR",message:"Failed to fetch learning path details"}},{status:500})}}let l=new a.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/learning-paths/[pathId]/route",pathname:"/api/learning-paths/[pathId]",filename:"route",bundlePath:"app/api/learning-paths/[pathId]/route"},resolvedPagePath:"/Users/s1dando/LMS-Git/learning-paths-service/app/api/learning-paths/[pathId]/route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:g,staticGenerationAsyncStorage:_,serverHooks:h}=l,E="/api/learning-paths/[pathId]/route";function m(){return(0,o.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:_})}},9178:(e,t,s)=>{s.d(t,{S:()=>a});var r=s(6176);async function a(e){let t=e.headers.get("authorization")||"",s=t.startsWith("Bearer ")?t.slice(7):"",a=process.env.JWT_SECRET||"dev_jwt_secret_change_me";if(!s)throw Error("Missing Bearer token");try{let e=new TextEncoder,{payload:t}=await (0,r._)(s,e.encode(a));return{userId:t.userId,organizationId:t.organizationId,email:t.email}}catch{throw Error("Invalid token")}}},4328:(e,t,s)=>{s.d(t,{I:()=>d});let r=require("pg");var a=s(7410);let n=a.z.object({DATABASE_URL:a.z.string().min(1)}),o=process.env.DATABASE_URL?n.parse({DATABASE_URL:process.env.DATABASE_URL}):{DATABASE_URL:process.env.DATABASE_URL||"placeholder"},i=global.pgPoolLearningPaths||new r.Pool({connectionString:o.DATABASE_URL});async function d(e,t){return{rows:(await i.query(e,t)).rows}}global.pgPoolLearningPaths||(global.pgPoolLearningPaths=i)},7435:(e,t,s)=>{s.d(t,{k:()=>o});var r=s(6091);async function a(){let e=process.env.JWT_SECRET||"dev_jwt_secret_change_me",t=new TextEncoder;return await new r.N({sub:"learning-paths-service"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("10m").sign(t.encode(e))}async function n(e,t){let s=process.env.LOGGING_ENDPOINT||"http://localhost:4010/api/logs",r=await a();try{await fetch(s,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${r}`},body:JSON.stringify({app:"learning-paths-service",level:e,message:t})})}catch{}}let o={info:e=>n("INFO",e),debug:e=>n("DEBUG",e),warn:e=>n("WARN",e),error:e=>n("ERROR",e)}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),r=t.X(0,[276,972,410,524],()=>s(891));module.exports=r})();