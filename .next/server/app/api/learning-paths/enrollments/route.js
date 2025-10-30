"use strict";(()=>{var e={};e.id=23,e.ids=[23],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},7261:e=>{e.exports=require("node:util")},6849:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>h,patchFetch:()=>E,requestAsyncStorage:()=>g,routeModule:()=>p,serverHooks:()=>m,staticGenerationAsyncStorage:()=>_});var s={};r.r(s),r.d(s,{GET:()=>c});var a=r(9303),i=r(8716),n=r(670),o=r(7070),l=r(4328),d=r(7435),u=r(9178);async function c(e){try{let t=await (0,u.S)(e),{searchParams:r}=new URL(e.url),s=r.get("status");d.k.info(`Fetching user enrollments: userId=${t.userId}, organizationId=${t.organizationId}, statusFilter=${s}`);let a="ue.user_id = $1 AND lp.organization_id = $2",i=[t.userId,t.organizationId];s&&(a+=" AND ue.status = $3",i.push(s));let n=`
      SELECT 
        ue.path_id,
        ue.enrolled_at,
        ue.last_activity,
        ue.status as enrollment_status,
        ue.progress,
        lp.*
      FROM user_enrollments ue
      JOIN learning_paths lp ON ue.path_id = lp.id
      WHERE ${a}
      ORDER BY ue.last_activity DESC
    `,c=await (0,l.I)(n,i),p=await Promise.all(c.rows.map(async e=>{let r=`
          SELECT c.id, c.title, m.title as milestone_title
          FROM user_course_progress ucp
          JOIN courses c ON ucp.course_id = c.id
          JOIN milestones m ON c.milestone_id = m.id
          WHERE ucp.user_id = $1 
            AND m.path_id = $2 
            AND ucp.status = 'in_progress'
          ORDER BY m.order_index, c.order_index
          LIMIT 1
        `,s=await (0,l.I)(r,[t.userId,e.path_id]),a=s.rows[0]?{id:s.rows[0].id,title:s.rows[0].title,milestone:s.rows[0].milestone_title}:void 0,i=(await (0,l.I)(`
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
          GROUP BY m.id
          ORDER BY m.order_index
        `,[e.path_id,t.userId])).rows.map(e=>({id:e.id,title:e.title,pathId:e.path_id,orderIndex:e.order_index,courses:e.courses||[]})),n=i.find(e=>e.courses.some(e=>"available"===e.status||"in_progress"===e.status))?.title||null;return{pathId:e.path_id,path:{id:e.id,title:e.title,description:e.description,category:e.category,difficulty:e.difficulty,estimatedTime:e.estimated_time,totalCourses:e.total_courses,completedCourses:e.completed_courses||0,status:e.enrollment_status,progress:e.progress,enrolledStudents:e.enrolled_students,rating:parseFloat(e.rating),instructor:e.instructor,skills:e.skills,nextMilestone:n,badges:e.badges,milestones:i,organizationId:e.organization_id,createdAt:e.created_at,updatedAt:e.updated_at},enrolledAt:e.enrolled_at,lastActivity:e.last_activity,currentCourse:a}}));return d.k.info(`User enrollments fetched successfully: userId=${t.userId}, enrollmentsCount=${p.length}`),o.NextResponse.json({success:!0,data:p})}catch(e){if(d.k.error(`Error fetching user enrollments: ${e.message}`),"Missing Bearer token"===e.message||"Invalid token"===e.message)return o.NextResponse.json({success:!1,error:{code:"UNAUTHORIZED",message:e.message}},{status:401});return o.NextResponse.json({success:!1,error:{code:"INTERNAL_ERROR",message:"Failed to fetch user enrollments"}},{status:500})}}let p=new a.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/learning-paths/enrollments/route",pathname:"/api/learning-paths/enrollments",filename:"route",bundlePath:"app/api/learning-paths/enrollments/route"},resolvedPagePath:"/Users/s1dando/LMS-Git/learning-paths-service/app/api/learning-paths/enrollments/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:g,staticGenerationAsyncStorage:_,serverHooks:m}=p,h="/api/learning-paths/enrollments/route";function E(){return(0,n.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:_})}},9178:(e,t,r)=>{r.d(t,{S:()=>a});var s=r(6176);async function a(e){let t=e.headers.get("authorization")||"",r=t.startsWith("Bearer ")?t.slice(7):"",a=process.env.JWT_SECRET||"dev_jwt_secret_change_me";if(!r)throw Error("Missing Bearer token");try{let e=new TextEncoder,{payload:t}=await (0,s._)(r,e.encode(a));return{userId:t.userId,organizationId:t.organizationId,email:t.email}}catch{throw Error("Invalid token")}}},4328:(e,t,r)=>{r.d(t,{I:()=>l});let s=require("pg");var a=r(7410);let i=a.z.object({DATABASE_URL:a.z.string().min(1)}),n=process.env.DATABASE_URL?i.parse({DATABASE_URL:process.env.DATABASE_URL}):{DATABASE_URL:process.env.DATABASE_URL||"placeholder"},o=global.pgPoolLearningPaths||new s.Pool({connectionString:n.DATABASE_URL});async function l(e,t){return{rows:(await o.query(e,t)).rows}}global.pgPoolLearningPaths||(global.pgPoolLearningPaths=o)},7435:(e,t,r)=>{r.d(t,{k:()=>n});var s=r(6091);async function a(){let e=process.env.JWT_SECRET||"dev_jwt_secret_change_me",t=new TextEncoder;return await new s.N({sub:"learning-paths-service"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("10m").sign(t.encode(e))}async function i(e,t){let r=process.env.LOGGING_ENDPOINT||"http://localhost:4010/api/logs",s=await a();try{await fetch(r,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({app:"learning-paths-service",level:e,message:t})})}catch{}}let n={info:e=>i("INFO",e),debug:e=>i("DEBUG",e),warn:e=>i("WARN",e),error:e=>i("ERROR",e)}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[276,972,410,524],()=>r(6849));module.exports=s})();