"use strict";(()=>{var e={};e.id=453,e.ids=[453],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},7261:e=>{e.exports=require("node:util")},4372:(e,s,r)=>{r.r(s),r.d(s,{originalPathname:()=>N,patchFetch:()=>m,requestAsyncStorage:()=>_,routeModule:()=>l,serverHooks:()=>E,staticGenerationAsyncStorage:()=>g});var t={};r.r(t),r.d(t,{PUT:()=>p});var o=r(9303),a=r(8716),i=r(670),n=r(7070),d=r(4328),u=r(7435),c=r(9178);async function p(e){try{let s=await (0,c.S)(e),{courseId:r,status:t,completedAt:o}=await e.json();if(!r||!t||!["in_progress","completed"].includes(t))return n.NextResponse.json({success:!1,error:{code:"VALIDATION_ERROR",message:"Valid courseId and status (in_progress|completed) are required"}},{status:400});u.k.info(`Updating course progress: userId=${s.userId}, courseId=${r}, status=${t}`);let a=`
      SELECT c.id, c.title, c.milestone_id, c.order_index as course_order,
             m.path_id, m.order_index as milestone_order, m.title as milestone_title,
             lp.total_courses, lp.organization_id
      FROM courses c
      JOIN milestones m ON c.milestone_id = m.id
      JOIN learning_paths lp ON m.path_id = lp.id
      WHERE c.id = $1 AND lp.organization_id = $2
    `,i=await (0,d.I)(a,[r,s.organizationId]);if(0===i.rows.length)return n.NextResponse.json({success:!1,error:{code:"NOT_FOUND",message:"Course not found"}},{status:404});let p=i.rows[0],l=`
      SELECT id FROM user_enrollments 
      WHERE user_id = $1 AND path_id = $2
    `,_=await (0,d.I)(l,[s.userId,p.path_id]);if(0===_.rows.length)return n.NextResponse.json({success:!1,error:{code:"FORBIDDEN",message:"User is not enrolled in this learning path"}},{status:403});let g=`
      INSERT INTO user_course_progress (user_id, course_id, status, completed_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, course_id)
      DO UPDATE SET 
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at,
        updated_at = NOW()
      RETURNING status, completed_at
    `,E="completed"===t?o||new Date().toISOString():null;if(await (0,d.I)(g,[s.userId,r,t,E]),"completed"===t){let e=`
        SELECT id FROM courses 
        WHERE milestone_id = $1 AND order_index = $2
      `,r=await (0,d.I)(e,[p.milestone_id,p.course_order+1]);if(r.rows.length>0){let e=`
          INSERT INTO user_course_progress (user_id, course_id, status, updated_at)
          VALUES ($1, $2, 'available', NOW())
          ON CONFLICT (user_id, course_id) DO NOTHING
        `;await (0,d.I)(e,[s.userId,r.rows[0].id])}else{let e=`
          SELECT COUNT(*) as total_courses,
                 COUNT(CASE WHEN ucp.status = 'completed' THEN 1 END) as completed_courses
          FROM courses c
          LEFT JOIN user_course_progress ucp ON c.id = ucp.course_id AND ucp.user_id = $2
          WHERE c.milestone_id = $1
        `,r=await (0,d.I)(e,[p.milestone_id,s.userId]),t=parseInt(r.rows[0].total_courses),o=parseInt(r.rows[0].completed_courses);if(t===o){let e=`
            SELECT c.id FROM courses c
            JOIN milestones m ON c.milestone_id = m.id
            WHERE m.path_id = $1 AND m.order_index = $2 AND c.order_index = 1
          `,r=await (0,d.I)(e,[p.path_id,p.milestone_order+1]);if(r.rows.length>0){let e=`
              INSERT INTO user_course_progress (user_id, course_id, status, updated_at)
              VALUES ($1, $2, 'available', NOW())
              ON CONFLICT (user_id, course_id) DO NOTHING
            `;await (0,d.I)(e,[s.userId,r.rows[0].id])}}}}let N=`
      SELECT 
        COUNT(CASE WHEN ucp.status = 'completed' THEN 1 END) as completed_courses,
        lp.total_courses
      FROM learning_paths lp
      LEFT JOIN milestones m ON lp.id = m.path_id
      LEFT JOIN courses c ON m.id = c.milestone_id
      LEFT JOIN user_course_progress ucp ON c.id = ucp.course_id AND ucp.user_id = $2
      WHERE lp.id = $1
      GROUP BY lp.total_courses
    `,m=await (0,d.I)(N,[p.path_id,s.userId]),I=parseInt(m.rows[0]?.completed_courses||"0"),O=m.rows[0]?.total_courses||p.total_courses,h=I/O*100,T=100===h?"completed":"in_progress",R=`
      UPDATE user_enrollments 
      SET progress = $1, completed_courses = $2, status = $3, last_activity = NOW()
      WHERE user_id = $4 AND path_id = $5
    `;await (0,d.I)(R,[h,I,T,s.userId,p.path_id]);let A=`
      SELECT c.id, c.title
      FROM courses c
      JOIN milestones m ON c.milestone_id = m.id
      JOIN user_course_progress ucp ON c.id = ucp.course_id
      WHERE m.path_id = $1 AND ucp.user_id = $2 AND ucp.status = 'available'
      ORDER BY m.order_index, c.order_index
      LIMIT 1
    `,w=(await (0,d.I)(A,[p.path_id,s.userId])).rows[0]||null;return u.k.info(`Course progress updated successfully: userId=${s.userId}, courseId=${r}, newStatus=${t}, pathProgress=${h}, pathStatus=${T}`),n.NextResponse.json({success:!0,message:"Progress updated successfully",data:{courseId:r,newStatus:t,pathProgress:Math.round(10*h)/10,nextUnlockedCourse:w}})}catch(e){if(u.k.error(`Error updating course progress: ${e.message}`),"Missing Bearer token"===e.message||"Invalid token"===e.message)return n.NextResponse.json({success:!1,error:{code:"UNAUTHORIZED",message:e.message}},{status:401});return n.NextResponse.json({success:!1,error:{code:"INTERNAL_ERROR",message:"Failed to update course progress"}},{status:500})}}let l=new o.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/learning-paths/progress/route",pathname:"/api/learning-paths/progress",filename:"route",bundlePath:"app/api/learning-paths/progress/route"},resolvedPagePath:"/Users/s1dando/LMS-Git/learning-paths-service/app/api/learning-paths/progress/route.ts",nextConfigOutput:"",userland:t}),{requestAsyncStorage:_,staticGenerationAsyncStorage:g,serverHooks:E}=l,N="/api/learning-paths/progress/route";function m(){return(0,i.patchFetch)({serverHooks:E,staticGenerationAsyncStorage:g})}},9178:(e,s,r)=>{r.d(s,{S:()=>o});var t=r(6176);async function o(e){let s=e.headers.get("authorization")||"",r=s.startsWith("Bearer ")?s.slice(7):"",o=process.env.JWT_SECRET||"dev_jwt_secret_change_me";if(!r)throw Error("Missing Bearer token");try{let e=new TextEncoder,{payload:s}=await (0,t._)(r,e.encode(o));return{userId:s.userId,organizationId:s.organizationId,email:s.email}}catch{throw Error("Invalid token")}}},4328:(e,s,r)=>{r.d(s,{I:()=>d});let t=require("pg");var o=r(7410);let a=o.z.object({DATABASE_URL:o.z.string().min(1)}),i=process.env.DATABASE_URL?a.parse({DATABASE_URL:process.env.DATABASE_URL}):{DATABASE_URL:process.env.DATABASE_URL||"placeholder"},n=global.pgPoolLearningPaths||new t.Pool({connectionString:i.DATABASE_URL});async function d(e,s){return{rows:(await n.query(e,s)).rows}}global.pgPoolLearningPaths||(global.pgPoolLearningPaths=n)},7435:(e,s,r)=>{r.d(s,{k:()=>i});var t=r(6091);async function o(){let e=process.env.JWT_SECRET||"dev_jwt_secret_change_me",s=new TextEncoder;return await new t.N({sub:"learning-paths-service"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("10m").sign(s.encode(e))}async function a(e,s){let r=process.env.LOGGING_ENDPOINT||"http://localhost:4010/api/logs",t=await o();try{await fetch(r,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${t}`},body:JSON.stringify({app:"learning-paths-service",level:e,message:s})})}catch{}}let i={info:e=>a("INFO",e),debug:e=>a("DEBUG",e),warn:e=>a("WARN",e),error:e=>a("ERROR",e)}}};var s=require("../../../../webpack-runtime.js");s.C(e);var r=e=>s(s.s=e),t=s.X(0,[276,972,410,524],()=>r(4372));module.exports=t})();