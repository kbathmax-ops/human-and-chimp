import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server=await createServer({server:{middlewareMode:true,hmr:false}});
try {
  const {HUMANS,CHIMPS,makeFighter,simulateFight}=await server.ssrLoadModule('/src/FightSimulator.jsx');
  const actions=new Set();let runs=0,groundSteps=0;const rates=new Map();
  for(const h of HUMANS)for(const c of CHIMPS)for(let seed=0;seed<(h.weapon?100:1000);seed++) {
    const human=makeFighter(h,'human'),chimp=makeFighter(c,'chimp');
    const result=simulateFight(human,chimp,seed);
    assert.deepEqual(result,simulateFight(human,chimp,seed),'Replay must preserve the encounter.');
    if(!human.weapon){assert(result.targetMatched,`Balanced encounter search exhausted: ${h.id}/${c.id}/${seed}`);const key=h.id+'/'+c.id;const rate=rates.get(key)||{wins:0,total:0};rate.total++;rate.wins+=result.winner==='human'?1:0;rates.set(key,rate);}else assert.equal(result.balance,undefined);
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
      if(['kick','kick-miss'].includes(step.type)){assert.equal(step.side,'human');assert(!human.weapon);assert.equal(step.position,'standing');assert(step.actionDistance>=.85&&step.actionDistance<=1.75);if(step.type==='kick-miss')assert.equal(step.damage,0);else assert(step.damage>0);}
    }
    runs++;
  }
  for(const type of ['clinch','pull','takedown','cover','frame','recover','tear','bite','kick','kick-miss'])assert(actions.has(type),`Missing action: ${type}`);
  for(const [matchup,rate] of rates){assert(rate.wins/rate.total>=.03&&rate.wins/rate.total<=.07,`${matchup}: unexpected win mix ${rate.wins}/${rate.total}`);}
  console.log('Unarmed win rates:',Object.fromEntries([...rates].map(([key,r])=>[key,r.wins+'/'+r.total])));
  console.log(`${runs} seeded encounters passed; ${groundSteps} ground steps; ${actions.size} action types.`);
} finally {await server.close();}
