import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server=await createServer({server:{middlewareMode:true,hmr:false}});
try {
  const {HUMANS,CHIMPS,makeFighter,simulateFight}=await server.ssrLoadModule('/src/FightSimulator.jsx');
  const actions=new Set();let runs=0,groundSteps=0;
  for(const h of HUMANS)for(const c of CHIMPS)for(let seed=0;seed<100;seed++) {
    const human=makeFighter(h,'human'),chimp=makeFighter(c,'chimp');
    const result=simulateFight(human,chimp,seed);
    assert.deepEqual(result,simulateFight(human,chimp,seed),'Replay must preserve the encounter.');
    assert(result.rounds.length>0&&result.rounds.length<=60);
    for(const step of result.rounds) {
      actions.add(step.type);
      assert(step.humanHP>=0&&step.chimpHP>=0);
      assert(step.humanStamina>=0&&step.humanStamina<=100);
      assert(step.chimpStamina>=0&&step.chimpStamina<=100);
      assert(step.injuryH>=0&&step.injuryH<=3);
      if(step.position==='ground'){groundSteps++;assert(step.groundController);assert(step.distance<=1.15);}
      if(['bite','tear'].includes(step.type))assert(step.actionDistance<=1.15,'Contact attack at invalid distance.');
      if(step.type==='shot')assert(step.position!=='ground');
    }
    runs++;
  }
  for(const type of ['clinch','pull','takedown','cover','frame','recover','tear','bite'])assert(actions.has(type),`Missing action: ${type}`);
  console.log(`${runs} seeded encounters passed; ${groundSteps} ground steps; ${actions.size} action types.`);
} finally {await server.close();}
