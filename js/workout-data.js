/* --- workout-data.js --- */
/**
 * Workout data bundle — demo history, colors, session template (not strength tables).
 * - Exercise library: js/workout-library.js (regenerate: node scripts/generate-library.mjs) — 287 lifts from Strength Level API.
 * - Strength standards: js/workout-strength-data.js (regenerate: node scripts/fetch-strength-level.mjs).
 * - EXERCISES_TEMPLATE: default session when app loads.
 * - HIST_DATA: demo history only.
 * - After swapping LIBRARY at runtime: call WorkoutCore.applyLibraryUpdate() then initLibrary().
 * Equipment "Barbell" / "Bodyweight" are recognized by js/workout-core.js.
 */

window.HIST_DATA=[
  {

    id:1,name:'Chest & Triceps',emoji:'💪',date:'Mar 20, 2025',day:'Thu',exercises:['Bench Press','Incline Dumbbell Fly','Tricep Pushdown'],sets:[9,9,9],bests:[{

    n:'Bench Press',w:102.5,r:5,isPR:true

}, {

  n:'Incline Dumbbell Fly',w:22,r:12

}, {

  n:'Tricep Pushdown',w:55,r:12

}],vol:5130,dur:'58m',hasPR:true

}, {

    id:2,name:'Back & Biceps',emoji:'🔙',date:'Mar 18, 2025',day:'Tue',exercises:['Deadlift','Dumbbell Row','Pull Ups'],sets:[9,9,9],bests:[{

    n:'Deadlift',w:140,r:5,isPR:true

}, {

  n:'Dumbbell Row',w:40,r:10

}, {

  n:'Pull Ups',w:0,r:8

}],vol:7200,dur:'62m',hasPR:true

}, {

    id:3,name:'Legs',emoji:'🦵',date:'Mar 16, 2025',day:'Sun',exercises:['Squat','Romanian Deadlift','Sled Leg Press'],sets:[9,9,12],bests:[{

    n:'Squat',w:120,r:5

}, {

  n:'Romanian Deadlift',w:100,r:8

}, {

  n:'Sled Leg Press',w:180,r:10

}],vol:12400,dur:'71m',hasPR:false

}, {

    id:4,name:'Shoulders',emoji:'🎯',date:'Mar 14, 2025',day:'Fri',exercises:['Shoulder Press','Face Pull'],sets:[9,9],bests:[{

    n:'Shoulder Press',w:70,r:5

}, {

  n:'Face Pull',w:35,r:15

}],vol:3240,dur:'44m',hasPR:false

}, {

    id:5,name:'Chest & Triceps',emoji:'💪',date:'Mar 12, 2025',day:'Wed',exercises:['Bench Press','Incline Dumbbell Fly','Tricep Pushdown'],sets:[9,9,9],bests:[{

    n:'Bench Press',w:100,r:5

}, {

  n:'Incline Dumbbell Fly',w:20,r:12

}, {

  n:'Tricep Pushdown',w:52.5,r:12

}],vol:4860,dur:'55m',hasPR:false

}, {

  id:6,name:'Back & Biceps',emoji:'🔙',date:'Mar 10, 2025',day:'Mon',exercises:['Deadlift','Dumbbell Row'],sets:[9,9],bests:[{

    n:'Deadlift',w:137.5,r:5

}, {

  n:'Dumbbell Row',w:38,r:10

}],vol:6900,dur:'54m',hasPR:false

}, {

  id:7,name:'Legs',emoji:'🦵',date:'Mar 7, 2025',day:'Fri',exercises:['Squat','Romanian Deadlift'],sets:[9,9],bests:[{

    n:'Squat',w:117.5,r:5

}, {

  n:'Romanian Deadlift',w:97.5,r:8

}],vol:11200,dur:'62m',hasPR:false

}, {

  id:8,name:'Full Body',emoji:'⚡',date:'Mar 5, 2025',day:'Wed',exercises:['Bench Press','Squat','Deadlift'],sets:[6,6,6],bests:[{

    n:'Bench Press',w:97.5,r:5

}, {

  n:'Squat',w:115,r:5

}, {

  n:'Deadlift',w:135,r:5

}],vol:9800,dur:'68m',hasPR:false

},

];

window.MC= {

  Chest:'#c8f135',Back:'#a5b4fc',Quads:'#fb923c',Hamstrings:'#fbbf24',Glutes:'#f472b6',Shoulders:'#4ade80',Triceps:'#f87171',Biceps:'#60a5fa',Forearms:'#a78bfa',Core:'#c084fc'

};

window.MB= {

  Chest:'rgba(200,241,53,.1)',Back:'rgba(165,180,252,.1)',Quads:'rgba(251,146,60,.1)',Hamstrings:'rgba(251,191,36,.1)',Glutes:'rgba(244,114,182,.1)',Shoulders:'rgba(74,222,128,.1)',Triceps:'rgba(248,113,113,.1)',Biceps:'rgba(96,165,250,.1)',Forearms:'rgba(167,139,250,.1)',Core:'rgba(192,132,252,.1)'

};

window.EXERCISES_TEMPLATE=[{name:'Bench Press',isBarbell:true,isBodyweight:false,history:[['20-03-25',102.5,5,true],['17-03-25',102.5,5],['13-03-25',100,5],['10-03-25',100,5],['06-03-25',97.5,5],['03-03-25',97.5,6],['27-02-25',95,5],['24-02-25',95,5],['20-02-25',92.5,5],['17-02-25',92.5,6]]},{name:'Incline Dumbbell Fly',isBarbell:false,isBodyweight:false,history:[['20-03-25',22,12],['17-03-25',22,10],['13-03-25',20,12],['10-03-25',20,10],['06-03-25',18,12],['03-03-25',18,12],['27-02-25',16,15],['24-02-25',16,12],['20-02-25',14,15],['17-02-25',14,12]]},{name:'Tricep Pushdown',isBarbell:false,isBodyweight:false,history:[['20-03-25',55,12],['17-03-25',52.5,12],['13-03-25',52.5,10],['10-03-25',50,12],['06-03-25',50,10],['03-03-25',47.5,12],['27-02-25',47.5,10],['24-02-25',45,12],['20-02-25',45,10],['17-02-25',42.5,12]]}];
