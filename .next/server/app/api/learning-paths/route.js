"use strict";(()=>{var e={};e.id=696,e.ids=[696],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},7261:e=>{e.exports=require("node:util")},6532:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>E,patchFetch:()=>m,requestAsyncStorage:()=>g,routeModule:()=>c,serverHooks:()=>h,staticGenerationAsyncStorage:()=>_});var r={};s.r(r),s.d(r,{GET:()=>p});var a=s(9303),i=s(8716),n=s(670),o=s(7070),u=s(4328),d=s(7435),l=s(9178);async function p(e){try{let t=await (0,l.S)(e),{searchParams:s}=new URL(e.url),r=s.get("status"),a=s.get("category"),i=s.get("difficulty"),n=parseInt(s.get("page")||"1"),p=parseInt(s.get("limit")||"10"),c=(n-1)*p;d.k.info(`Fetching learning paths: userId=${t.userId}, organizationId=${t.organizationId}, filters=${JSON.stringify({status:r,category:a,difficulty:i,page:n,limit:p})}`);let g=["lp.organization_id = $1"],_=[t.organizationId],h=1;r&&(h++,g.push(`ue.status = $${h}`),_.push(r)),a&&(h++,g.push(`lp.category = $${h}`),_.push(a)),i&&(h++,g.push(`lp.difficulty = $${h}`),_.push(i));let E=g.join(" AND "),m=`
      SELECT 
        lp.*,
        COALESCE(ue.status, 'not_started') as user_status,
        COALESCE(ue.progress, 0) as user_progress,
        COALESCE(ue.completed_courses, 0) as user_completed_courses,
        COALESCE(ue.enrolled_at, NULL) as enrolled_at,
        COALESCE(ue.last_activity, NULL) as last_activity
      FROM learning_paths lp
      LEFT JOIN user_enrollments ue ON lp.id = ue.path_id AND ue.user_id = $${h+1}
      WHERE ${E}
      ORDER BY lp.created_at DESC
      LIMIT $${h+2} OFFSET $${h+3}
    `;_.push(t.userId,p,c);let A=await (0,u.I)(m,_),I=`
      SELECT COUNT(*) as total
      FROM learning_paths lp
      LEFT JOIN user_enrollments ue ON lp.id = ue.path_id AND ue.user_id = $${h+1}
      WHERE ${E}
    `,R=[..._.slice(0,-2),t.userId],O=await (0,u.I)(I,R),f=parseInt(O.rows[0]?.total||"0"),L=await Promise.all(A.rows.map(async e=>{let s=(await (0,u.I)(`
          SELECT 
            m.*,
            json_agg(
              json_build_object(
                'id', c.id,
                'title', c.title,
                'duration', c.duration,
                'status', COALESCE(ucp.status, 'locked'),
                'orderIndex', c.order_index
              ) ORDER BY c.order_index
            ) as courses
          FROM milestones m
          LEFT JOIN courses c ON m.id = c.milestone_id
          LEFT JOIN user_course_progress ucp ON c.id = ucp.course_id AND ucp.user_id = $2
          WHERE m.path_id = $1
          GROUP BY m.id, m.title, m.path_id, m.order_index
          ORDER BY m.order_index
        `,[e.id,t.userId])).rows.map(e=>({id:e.id,title:e.title,pathId:e.path_id,orderIndex:e.order_index,courses:e.courses||[]})),r=s.find(e=>e.courses.some(e=>"available"===e.status||"in_progress"===e.status))?.title||null;return{id:e.id,title:e.title,description:e.description,category:e.category,difficulty:e.difficulty,estimatedTime:e.estimated_time,totalCourses:e.total_courses,completedCourses:e.user_completed_courses,status:e.user_status,progress:e.user_progress,enrolledStudents:e.enrolled_students,rating:parseFloat(e.rating),instructor:e.instructor,skills:e.skills,nextMilestone:r,badges:e.badges,milestones:s,organizationId:e.organization_id,createdAt:e.created_at,updatedAt:e.updated_at}})),S=Math.ceil(f/p);return d.k.info(`Learning paths fetched successfully: userId=${t.userId}, pathsCount=${L.length}, total=${f}, page=${n}, totalPages=${S}`),o.NextResponse.json({success:!0,data:{paths:L,pagination:{page:n,limit:p,total:f,totalPages:S}}})}catch(e){if(d.k.error(`Error fetching learning paths: ${e.message}`),"Missing Bearer token"===e.message||"Invalid token"===e.message)return o.NextResponse.json({success:!1,error:{code:"UNAUTHORIZED",message:e.message}},{status:401});return o.NextResponse.json({success:!1,error:{code:"INTERNAL_ERROR",message:"Failed to fetch learning paths"}},{status:500})}}let c=new a.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/learning-paths/route",pathname:"/api/learning-paths",filename:"route",bundlePath:"app/api/learning-paths/route"},resolvedPagePath:"/Users/s1dando/LMS-Git/learning-paths-service/app/api/learning-paths/route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:g,staticGenerationAsyncStorage:_,serverHooks:h}=c,E="/api/learning-paths/route";function m(){return(0,n.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:_})}},9178:(e,t,s)=>{s.d(t,{S:()=>a});var r=s(6176);async function a(e){let t=e.headers.get("authorization")||"",s=t.startsWith("Bearer ")?t.slice(7):"",a=process.env.JWT_SECRET||"dev_jwt_secret_change_me";if(!s)throw Error("Missing Bearer token");try{let e=new TextEncoder,{payload:t}=await (0,r._)(s,e.encode(a));return{userId:t.userId,organizationId:t.organizationId,email:t.email}}catch{throw Error("Invalid token")}}},4328:(e,t,s)=>{s.d(t,{I:()=>u});let r=require("pg");var a=s(7410);let i=a.z.object({DATABASE_URL:a.z.string().min(1)}),n=process.env.DATABASE_URL?i.parse({DATABASE_URL:process.env.DATABASE_URL}):{DATABASE_URL:process.env.DATABASE_URL||"placeholder"},o=global.pgPoolLearningPaths||new r.Pool({connectionString:n.DATABASE_URL});async function u(e,t){return{rows:(await o.query(e,t)).rows}}global.pgPoolLearningPaths||(global.pgPoolLearningPaths=o)},7435:(e,t,s)=>{s.d(t,{k:()=>n});var r=s(6091);async function a(){let e=process.env.JWT_SECRET||"dev_jwt_secret_change_me",t=new TextEncoder;return await new r.N({sub:"learning-paths-service"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("10m").sign(t.encode(e))}async function i(e,t){let s=process.env.LOGGING_ENDPOINT||"http://localhost:4010/api/logs",r=await a();try{await fetch(s,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${r}`},body:JSON.stringify({app:"learning-paths-service",level:e,message:t})})}catch{}}let n={info:e=>i("INFO",e),debug:e=>i("DEBUG",e),warn:e=>i("WARN",e),error:e=>i("ERROR",e)}}};var t=require("../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),r=t.X(0,[276,972,410,524],()=>s(6532));module.exports=r})();