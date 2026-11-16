---
theme: default
title: Market Equilibrium · Stability and Time Paths
defaults:
  layout: default
colorSchema: light
fonts:
  provider: none
duration: 20min
routerMode: hash
transition: market-shift


---

<div class="tag">Predicting the market with differential equations</div>

<div class="split"><div>

# Market equilibrium

Stability and time paths

<div class="credit">Zayd Krunz &amp; David Garcia</div>
</div><img :src="basePath + 'cover.svg'" alt="One price path approaches equilibrium while another falls away."/></div>

<script setup>
const basePath = import.meta.env.BASE_URL
</script>

<!--
**The hook — ask the room, don't explain yet.**
- "Quick question. Say the right price for something is ten dollars, but right now it's selling for nine. What happens next? Does it climb back to ten, or keep sliding?"
- Let a couple people answer. Most will say it goes back up.

**Then set up the talk.**
- "Turns out it depends on how people behave. We're going to look at two models of a market."
- "Model one: prices just react to whether there are too many buyers or too many sellers."
- "Model two: people also watch the trend. If the price is going up, they act on that."
- "Both models agree on the 'right' price. But one pulls the price back, and the other pushes it away. That's the whole talk."

**Point at the picture.**
- "The green path settles at the dashed line. The gold one falls away. By the end you'll know exactly which equation makes which."

**Close the intro:** "We'll do the math, then you're going to trade it yourselves on your phones."
-->

---
transition: none
---

<div class="tag">The starting point</div>

# The equilibrium price

<div class="split"><div>

<div v-click>
<div class="demand-supply">

<div class="eq-qd">

$$
q_d=d_0-d_1p
$$

</div>
<div class="eq-qs">

$$
q_s=-s_0+s_1p
$$

</div>
</div>
</div>

<div v-click>

Equating demand and supply gives

</div>

<div v-click>

$$
p^*=\frac{d_0+s_0}{d_1+s_1}.
$$

</div>

</div><MarketLab mode="supply" /></div>

<!--
**The big idea:** buyers want less when it's expensive, sellers offer more when it's expensive. Where those meet is the equilibrium price, p star.

[click] **The two equations appear. Point at q_d = d0 − d1 p.**
- "q d is how much buyers want. d for demand."
- "d0 is how much they'd want if it were free. Every dollar the price goes up, they want d1 less. That's why it's minus."

**Point at q_s = −s0 + s1 p.**
- "q s is how much sellers offer. s for supply."
- "Every dollar the price goes up, sellers offer s1 more. That's why it's plus."

[click] **"Equating demand and supply gives" appears.**
- "Equilibrium is where those are equal. Set them equal and solve for p."

[click] **The equilibrium price appears. Point at the p* formula.**
- "You get p star equals d0 plus s0 over d1 plus s1."
- "That's the price where every buyer who wants one finds a seller."

**Now drag the slider (Posted price) — this is the fun part.**
- Start at 6: "Here, demand and supply are both 4. Quantities match, price holds. That's p star equals 6."
- Drag to 4: "At four dollars, buyers want 6 but sellers only offer 2. Four extra buyers fighting over too few units. What's the price going to do?" (Up.)
- Drag to 8: "At eight it flips. Sellers offer 6, buyers want 2. Too much stuff. Price falls."

**Bridge to the next slide:** "So the gap between demand and supply tells us which way the price should move. The first model turns that into an equation."

**If anyone looks lost:** "Think concert tickets. Cheap tickets, everybody wants one, they sell out, price goes up. Overpriced, nobody buys, price comes down."
-->

---
transition: none
---

<div class="tag">Part A</div>

# Price adjustment

<div class="demand-supply corner">

<div class="eq-qd"><GlideFrom :dx="-701" :dy="109">

$$
q_d=d_0-d_1p
$$

</GlideFrom></div>
<div class="eq-qs"><GlideFrom :dx="-701" :dy="108">

$$
q_s=-s_0+s_1p
$$

</GlideFrom></div>
</div>

<div class="reveal-lines">

$$ {hide|1|1-2|1-3|1-4|all}
\begin{aligned}
p' &= \lambda(q_d-q_s)\\
   &= \lambda\big[d_0+s_0-(d_1+s_1)p\big]\\
   &= \lambda\left[(d_1+s_1)\cdot\frac{d_0+s_0}{d_1+s_1}-(d_1+s_1)p\right]\\
   &= \lambda\big[(d_1+s_1)p^*-(d_1+s_1)p\big]\\
   &= -\lambda(d_1+s_1)(p-p^*).
\end{aligned}
$$

</div>

<!--
**The big idea first:** the price moves depending on how out of balance the market is. Too many buyers, it goes up. Too many sellers, it goes down.

**q_d and q_s slide into the top-right corner** so the room can see both lines while you plug them in.

[click] **Line 1 appears — point at p′ = λ(q_d − q_s).**
- "p prime is how fast the price is changing."
- "q_d minus q_s is the imbalance we just played with on the slider. Positive means more buyers than sellers."
- "Lambda is just a speed knob. It's positive. Big lambda, the price reacts fast."
- Say it in words: "More buyers than sellers, price goes up. More sellers, price goes down. Balanced, price stays put."

[click] **Line 2 appears — point at the bracket.**
- "Now we plug in our two lines (point at the corner): demand is d0 minus d1 p, supply is minus s0 plus s1 p."
- "When we subtract supply, the minus s0 flips to plus s0, and the p terms group together."
- "So the imbalance is d0 plus s0, minus d1 plus s1 times p."

[click] **Line 3 appears — point at the fraction.**
- "Here's the trick. Multiply and divide d0 plus s0 by d1 plus s1. Nothing changes, the d1 plus s1 cancels."
- "But look at that fraction: d0 plus s0 over d1 plus s1. That's exactly p star from the last slide."

[click] **Line 4 appears — point at (d1 + s1)p*.**
- "So swap the fraction for p star."

[click] **Line 5 appears — point at (p − p*).**
- "Both terms have d1 plus s1 in them, so factor it out, and pull the minus sign to the front."
- "Now the price only cares about one thing: how far it is from p star. That's the gap, p minus p star."
-->

---
class: continued
---

<div class="tag">Part A</div>

# Price adjustment

<div class="carried"><GlideFrom :dx="-86" :dy="191">

$$
\begin{aligned}
p' &= -\lambda(d_1+s_1)(p-p^*)
\end{aligned}
$$

</GlideFrom></div>

<div class="a-corner">

<span class="ghost">$a=\lambda(d_1+s_1)>0$</span>

</div>

<div class="after-glide swap-line">

<span v-click.hide="1">Let</span> <MoveOnClick :at="1" to=".a-corner .ghost">$a=\lambda(d_1+s_1)>0$</MoveOnClick><span v-click.hide="1">, so $p'=-a(p-p^*)$.</span>

<div v-click="1" class="swap-over"><div v-click.hide="2">

Multiply by the integrating factor $e^{at}$.

</div></div>
</div>

<div class="reveal-lines">

$$ {hide|1|1-2|1-3|1-4|all}
\begin{aligned}
p'+ap &= ap^*\\
e^{at}p'+ae^{at}p &= ap^*e^{at}\\
\big(e^{at}p\big)' &= ap^*e^{at}\\
e^{at}p &= p^*e^{at}+C\\
p &= p^*+Ce^{-at}
\end{aligned}
$$

</div>

<div v-click class="result">

$p(0)=p_0\;\Rightarrow\;C=p_0-p^*,\quad\text{so}\quad p(t)=p^*+(p_0-p^*)e^{-at}.$

</div>

<!--
**The last line of the previous slide, p′ = −λ(d1 + s1)(p − p*), glides up to the top. Then "Let a = …" fades in. Point at a.**
- "All the constants out front, lambda times d1 plus s1, call that one number a. Lambda, d1, s1 are all positive, so a is positive. Remember that, it's the whole story."
- "So p prime equals minus a times the gap."

[click] **a = λ(d1 + s1) > 0 moves to the top-right corner. "Multiply by the integrating factor e^{at}" and line 1 appear.**
- "I'll park a up in the corner so we can keep an eye on it."
- "Distribute the minus a and move the p term to the left. Standard linear form: p prime plus a p equals a p star."
- "This is a first-order linear equation, so we solve it with an integrating factor: e to the a t."

[click] **Line 2 — multiply through by e^{at}. The "Multiply by…" note goes away.**
- "Multiply every term by e to the a t."

[click] **Line 3 — point at (e^{at} p)′.**
- "The left side is exactly the product rule for e to the a t times p. That's why we picked that factor."

[click] **Line 4 — integrate both sides.**
- "Integrate. The integral of a p star e to the a t is p star e to the a t, plus a constant C."

[click] **Line 5 — divide by e^{at}.**
- "Divide through and the price is p star plus C e to the minus a t."

[click] **The answer pops up.**
- "At time zero, the exponential is 1, so p0 equals p star plus C. C is just the starting gap, p0 minus p star."
- "So the price path is p star plus the starting gap times e to the minus a t."
- "a is positive, so e to the minus a t shrinks. The gap dies out. That's the punchline for the next slide."

**If anyone looks lost:** "Forget the algebra for a sec. Price too high, sellers pile up, price falls. Price too low, buyers pile up, price rises. The math just proves it happens smoothly and exponentially."
-->

---

<div class="tag">Part B</div>

# Global stability

<div class="split"><div>

$$
p(t)=p^*+(p_0-p^*)e^{-at}
$$

Since $a>0$, the factor $e^{-at}$ shrinks to zero.

$$
\lim_{t\to\infty}p(t)=p^*
$$

</div><MarketLab mode="stable" /></div>


<!--
**The big idea:** in model one, every starting price comes back to p star. That's what "globally stable" means.

**Point at p(t) at the top.** "Here's the price path we just solved for."

**Point at "a > 0, e^{−at} shrinks to zero."**
- "Remember a is positive. e to minus a t gets smaller and smaller. It goes to zero."
- "And the gap is the starting gap times that shrinking number. So the gap goes to zero too."

**Point at the limit.**
- "That's all this line says: wait long enough, and the price ends up at p star."

**Point at the graph.**
- "Here are four different starting prices. Two above ten, two below. Every single one ends up at ten."
- Hit **Replay paths** so they watch it happen.

**Drag the Speed slider.**
- "This slider is how fast prices react, lambda times d1 plus s1."
- Slide it up: "Faster reaction, they snap back quicker." Slide it down: "Slower, but they still get there."
- Point at the caption: "It even tells you: half the gap closes every so many time units. That's a half-life, same as radioactive decay."

**Point at the graph again.**
- "Notice none of the lines cross the dashed line. Start above, you come down to it. Start below, you come up to it. You never overshoot. e to anything is positive, so the gap never flips sign."
- Point at the arrows under the graph: "Both arrows point at p star. Everything flows in."

**The word to land:** "Every starting price returns. That word every is what makes it globally stable."
-->

---

<div class="tag">Part C</div>

# Expectations

<div class="big-eqs">

$$
\begin{aligned}
q_d &= d_0-d_1p+d_2p'\\
q_s &= -s_0+s_1p-s_2p'
\end{aligned}
$$

</div>

<div class="result expect-note">

When the price is expected to rise, buyers purchase more and suppliers sell less.

</div>

<!--
**The big idea:** now people react to the trend, not just the price. If the price is rising, buyers rush in and sellers hold out.

**Set it up with a story first.**
- "Imagine you find out concert ticket prices are going up next week. What do you do?" (Buy now.)
- "And if you're holding a spare ticket and you know prices are rising?" (Wait, sell later for more.)

**Point at the new d2 p′ term in q_d.**
- "So demand gets a new piece: plus d2 times p prime. p prime is how fast the price is rising."
- "Price rising means p prime is positive, so buyers want more right now. They're buying before it gets pricier."

**Point at the − s2 p′ term in q_s.**
- "Supply gets minus s2 times p prime. Price rising, sellers offer less right now. They're holding out for a better price."
- "Opposite signs because buyers and sellers react in opposite ways."

**Bridge to the next slide (say it, there's no box anymore).**
- "Now here's the rule for this model: the market always clears. Every unit someone wants to buy matches a unit someone sells, at every instant."
- "So the question is: how fast does the price have to be moving for that to work out? That's the next slide."

**If anyone looks lost:** "It's the same supply and demand, plus FOMO. People watch the chart."
-->

---

<div class="tag">Part C</div>

# Market clearing path

<div class="reveal-lines">

$$ {hide|1|1-2|1-3|all}
\begin{aligned}
d_0-d_1p+d_2p' &= -s_0+s_1p-s_2p'\\
(d_2+s_2)p' &= (d_1+s_1)p-(d_0+s_0)\\
p' &= \frac{d_1+s_1}{d_2+s_2}\left[p-\frac{d_0+s_0}{d_1+s_1}\right]\\
p' &= k(p-p^*),\qquad k=\frac{d_1+s_1}{d_2+s_2}>0
\end{aligned}
$$

</div>

<div v-click="5" class="result reveal-lines same-steps">

$$ {1|all} {at:6}
\begin{aligned}
\text{Part A:}\quad p' &= -a(p-p^*) &\;\Longrightarrow\;\; p(t) &= p^*+(p_0-p^*)e^{-at}\\
\text{Now:}\quad p' &= \phantom{-}k(p-p^*) &\;\Longrightarrow\;\; p(t) &= p^*+(p_0-p^*)e^{kt}
\end{aligned}
$$

</div>

<!--
**The big idea:** do the same algebra as model one, and the sign flips. That one sign changes everything.

[click] **Line 1 — point at the top equation.**
- "We just set demand equal to supply. Left side is demand, right side is supply, both with the new trend terms."

[click] **Line 2 — point at (d2 + s2)p′.**
- "Move all the p prime terms to the left. d2 p prime and plus s2 p prime, so d2 plus s2 times p prime."
- "Move the plain p terms to the right. Those become d1 plus s1 times p, minus d0 plus s0."

[click] **Line 3 — point at the bracket.**
- "Divide both sides by d2 plus s2, and pull d1 plus s1 out of the right side."
- "Look inside the bracket: d0 plus s0 over d1 plus s1. That's exactly p star again."

[click] **Line 4 — point at p′ = k(p − p*).**
- "Swap the fraction for p star, and call the number out front k."
- "So p prime equals k times p minus p star. k is d1 plus s1 over d2 plus s2."
- "Everything in k is positive, so k is positive."

[click] **The box appears with the Part A equation we already solved.**
- "Look familiar? This is the equation from Part A, and its answer. Same shape: p prime equals a number times the gap."

[click] **The new equation and its answer appear underneath.**
- "Ours is the exact same equation, just with plus k where Part A had minus a. So the exact same steps work: integrating factor e to the minus k t, integrate, plug in p0."
- "You get p star plus the starting gap times e to the k t."
- "Only now k is positive, so e to the k t grows."

**Why the sign makes sense:** "Say price is below p star. Normally buyers would outnumber sellers. For the market to still clear, the price has to be falling: falling prices make buyers wait and sellers dump. So below p star, the price falls. It runs away."
-->

---

<div class="tag">Part D</div>

# Instability with expectations

<div class="split"><div>

$$
p(t)=p^*+(p_0-p^*)e^{kt}
$$

Above $p^*$, the price rises. Below $p^*$, it falls.

Only $p_0=p^*$ gives a constant path.

</div><MarketLab mode="unstable" /></div>


<!--
**The big idea:** yes. The market clears at every instant and still runs away from equilibrium. That's an unstable equilibrium.

**Point at p(t) at the top.** "Here's the market-clearing path we just solved for."

**Point at e^{kt} in p(t).**
- "Remember k is positive, so e to the k t gets bigger and bigger. The gap blows up."

**Point at the two bullets.**
- "Start above p star, the price keeps rising. Start below, it keeps falling."
- "The only way to stay put is to start exactly at p star. Any tiny nudge and you're gone."

**Point at the graph. Hit Replay paths.**
- "These start really close to ten. Ten and a half, nine and a half. Watch."
- "They hang around for a bit, then take off. The ones above go up, the ones below go down."
- Point at the arrows under the graph: "Compare to the last graph. Before, both arrows pointed in. Now they point out."

**Drag the Trend reaction slider.**
- "This is d2 plus s2, how strongly people react to the trend. It's on the bottom of k."
- Slide it up: "React more strongly, the paths move away more slowly." Slide it down: "Faster."
- "But no setting makes them come back. They always run away. Only the speed changes."

**The line to land:** "Supply equals demand at every point on these curves. The market clears the whole time. And it still drifts away. Equilibrium doesn't mean stable."
-->

---

<div class="tag">Compare the feedback</div>

# Comparing the two equilibria

<div class="analogy-grid">
<div v-click="1">

### Price adjustment model

<svg viewBox="0 0 380 120" role="img" aria-label="A ball settles at the bottom of a valley"><path d="M20 15Q190 200 360 15" fill="none" stroke="#70e6a7" stroke-width="4"/><circle cx="190" cy="107" r="10" fill="#70e6a7"/><text x="70" y="60">↘</text><text x="290" y="60">↙</text></svg>

$p'=-a(p-p^*)$, with $a>0$.

Above equilibrium → price falls.<br/>
Below equilibrium → price rises.

</div><div v-click="2">

### Expectations model

<svg viewBox="0 0 380 120" role="img" aria-label="A ball moves away from the top of a hill"><path d="M20 110Q190 -75 360 110" fill="none" stroke="#f5bd70" stroke-width="4"/><circle cx="190" cy="9" r="9" fill="#f5bd70"/><text x="70" y="60">↙</text><text x="290" y="60">↘</text></svg>

$p'=k(p-p^*)$, with $k>0$.

Above equilibrium → price rises.<br/>
Below equilibrium → price falls.

</div></div>

<!--
**The big idea:** a valley versus a hilltop. Same flat spot, opposite behavior.

**Before clicking:** "Here's the picture to remember both models."

[click] **The valley appears (price adjustment).**
- "Equilibrium is the bottom of a valley. Push the ball a little, it rolls back down."
- "That's model one. Price above p star, it falls. Below, it rises. The minus sign flips the direction back toward p star."

[click] **The hilltop appears (expectations).**
- "Now equilibrium is the top of a hill. The ball can sit there perfectly balanced."
- "But push it even a little and it rolls away. That's model two. The plus sign keeps pushing in the direction it's already going."

**Tie it together.**
- "Both have a resting spot at p star. The sign of the coefficient decides valley or hill."

**Honesty note if someone asks:** "A real ball overshoots and bounces. Our equations are first order, so no bouncing. The picture is just about which direction a push sends you."
-->

---
class: compact
---

<div class="tag">Part E · Starting at five dollars</div>

# What price does the model predict?

<div v-click class="givens">

$$
\text{Given:}\quad q_d=30-2p+4p',\qquad q_s=-20+p-6p',\qquad p(0)=5
$$

</div>

<div v-click>

$$
30-2p+4p'=-20+p-6p' \quad\Rightarrow\quad 10p'=3p-50.
$$

</div>

<div v-click>

$$
p'=\frac{3}{10}\left(p-\frac{50}{3}\right)=k(p-p^*)\quad\Rightarrow\quad k=\frac{3}{10},\quad p^*=\frac{50}{3}
$$

</div>

<div class="reveal-lines">

$$ {hide|1|all}
\begin{aligned}
p(t) &= p^*+(p_0-p^*)e^{kt}\\
&= \frac{50}{3}-\frac{35}{3}e^{3t/10}
\end{aligned}
$$

</div>

<div v-click class="result">

At month ten, $p(10)=(50-35e^3)/3\approx-\$217.66$.

</div>

<!--
**The big idea:** plug in real numbers and the unstable model predicts something wild: a negative price.

[click] **The given line appears.**
- "Here's the exercise. Time is in months. Demand is 30 minus 2p plus 4 p prime. Supply is minus 20 plus p minus 6 p prime. Price starts at five dollars."

[click] **Next line — point at 10p′ = 3p − 50.**
- "Market clearing again, so set q_d equal to q_s. Move the p prime terms left: 4 plus 6 is 10 p prime."
- "Move the p terms right: p plus 2p is 3p. And 30 plus 20 is 50."

[click] **Where p* and k come from.**
- "Divide by 10 and factor out 3 over 10. Now it looks exactly like Part C: p prime equals k times p minus p star."
- "So we can just read them off: k is 3 over 10, and p star is 50 over 3. About sixteen sixty-seven."

[click] **The general solution appears.**
- "We already solved this equation in Part C. No need to solve it again. The answer is p star plus the starting gap times e to the k t."

[click] **Plug in the numbers.**
- "So we just plug in constants: p star is 50 over 3, p0 is 5, k is 3 over 10."
- "We start at five, which is 35 over 3 below equilibrium, so the starting gap is minus 35 over 3. About eleven sixty-seven under."
- "Starting below and k is positive. Which way does it go?" (Down, and faster and faster.)

[click] **The answer pops up.**
- "At month ten, plug in t equals 10. e to the 3 is about 20."
- "So the price is about negative two hundred seventeen dollars. Negative."
- Pause. "The gap started at about twelve dollars and grew twenty times."

**If anyone asks how a price can be negative:** "It can't, really. That's the next slide: the model breaks down before then."
-->

---

<div class="tag">Part E · Interpreting the forecast</div>

# The decline accelerates

<div class="split"><div>

$$
p'(t)=-3.5e^{0.3t}
$$

The slope falls from −$3.50 per month to −$70.30 per month by month ten.

Both $p$ and $p'$ tend to $-\infty$.

</div><MarketLab mode="example" /></div>




<!--
**The big idea:** the price doesn't just fall, it falls faster and faster, and it hits zero in about a month.

**Point at p′(t) = −3.5 e^{0.3t}.**
- "Take the derivative of our price path. That's how fast the price is changing."
- "At the start, t is zero, so it's minus three fifty a month."
- "By month ten it's about minus seventy dollars a month. The drop keeps speeding up."

**Point at "both p and p′ go to minus infinity."**
- "Both the price and its speed head to negative infinity. No floor."

**Use the graph buttons.**
- Click **First 2.5 months**: "Here's the start. Watch it cross zero."
- Point at the caption: "It hits zero at about 1.19 months. That's when e to the 0.3 t equals 50 over 35. Take a log and you get that."
- Click **First 10 months**: "Zoom out and it's a cliff. Negative two seventeen by month ten."

**Why it accelerates (the people story).**
- "Buyers expect a bigger drop, so they wait even longer. Sellers want out before the next drop, so they dump even harder. Each month the reasons get stronger."

**The honest takeaway:** "Real prices can't go below zero. So this model stops being useful after about a month. But the instability is real. That's what a crash looks like."
-->

---

<div class="tag">Part E · Buyers and sellers</div>

# Why does the fall accelerate?

<div class="feedback-row">
<div v-click="1">Price falls<MathTex tex="p' < 0" block /></div>
<span v-click="2">→</span>
<div v-click="2">Buyers wait<MathTex tex="4p' < 0" block /></div>
<span v-click="3">+</span>
<div v-click="3">Sellers sell now<MathTex tex="-6p' > 0" block /></div>
</div>

<div v-click="4" class="result">Both expectation effects favor a further decline.</div>

At the same price, buyers demand less and sellers supply more than they would without the trend terms.

<!--
**The big idea:** when the price falls, both buyers and sellers make it fall more. That's the feedback loop.

**Before clicking:** "Let's trace why the fall speeds up."

[click] **"Price falls, p′ < 0."**
- "Say the price is falling. So p prime is negative."

[click] **"Buyers wait, 4p′ < 0."**
- "In the demand equation there's plus 4 p prime. p prime is negative, so that term is negative."
- "Translation: buyers want less right now. Why buy today if it'll be cheaper tomorrow?"

[click] **"Sellers sell now, −6p′ > 0."**
- "In supply there's minus 6 p prime. Negative times negative is positive."
- "Translation: sellers offer more right now. Get out before it drops more."

[click] **"Both favor a further decline."**
- "Fewer buyers, more sellers. Both push the price down even more. Which makes p prime more negative. Which makes both effects stronger."
- "That's the loop. That's why it accelerates."

**Careful point if someone pushes back:** "This is compared to the same price with no trend. As the price gets really low, some buyers do jump in. The equation adds all that up, and the total still says: keep falling."

**Bridge to the game:** "You're about to feel this loop for real."
-->

---

<div class="tag">Live trading · Buyers and sellers</div>

# Closing Bell

Scan the code on the projector. You get a secret card and a role.

| Buyer | Seller |
|---|---|
| Pay less than your card. Profit = card − price. | Sell for more than your card. Profit = price − card. |

Find someone on the other side, haggle, and report the deal. They confirm. Before each round, call it: will the gap to the fair price shrink or grow? First up: a 45-second practice round.

<div class="result"><a href="https://market.zaydkrunz.com/" target="_blank">Open the trading floor ↗</a></div>

<!--
**The big idea:** get everyone on their phones and trading fast. Keep it short; the app's how-to screen does the teaching.

**Get them in.**
- "Phones out. Scan the code on the screen, or go to the site and type the PIN. Pick a name and an animal."
- Wait until the lobby has everyone. Start the game.

**Talk over the How to Play screen (20 seconds).**
- "Half of you are buyers, half sellers. Your card has a secret number."
- "Buyers: pay less than your number and you profit. Sellers: sell for more than your number."
- "Find someone on the other side. Out loud, in person, haggle."
- "When you agree, one of you taps Make a deal, picks the other person, types the price. They hit confirm. Ka-ching."
- "You get a new card after every deal, so keep going. Cards also expire, so use them."

**Practice round.**
- "First a 45-second practice round. It doesn't count. Everyone just make one deal."
- After: the screen shows who hasn't traded. Help them.

**Before round 1:** "Every round, before the bell, make the call on your phone: will the gap to the fair price shrink or grow? Right call is 25 bucks. Most money at the end wins."

**At halftime the app explains meme mode. Just read the loop off the screen:** "Everyone watches the chart. Your card follows the trend. Higher cards mean higher deals. It feeds itself."
-->

---

<div class="tag">Closing Bell · Desk recap</div>

# Did our class match the math?

| First half · Blue chip | Second half · Meme mode |
|---|---|
| $p' = -\lambda(d_1+s_1)(p-p^*)$ | Cards shift by $\beta p'$, so $p' = k(p-p^*)$ |
| The opening gap shrank toward $p^*$. | A small push turned into a bubble. |

<!--
**The big idea:** point at the results screens and connect them back to the two equations.

**First half (blue chip).**
- "In the first half, every round opened way off the fair price. And it drifted back. The gap shrank."
- "That's model one. p prime equals minus lambda times the gap."
- "The app fit an exponential to your actual trades. The decay rate a came out positive, so the gap shrank like e to the minus a t. That number is your class's lambda, how fast you all reacted."

**Second half (meme mode).**
- "In the second half, I changed one thing. Your cards moved with the price trend."
- "That's exactly the d2 and s2 terms from Part C. Buyers FOMO in, sellers hold out."
- "And a tiny push in the pre-market turned into a bubble. The fitted rate went positive. That's k."

**Ask the room.**
- "Who called GROW at halftime? Who got burned calling SHRINK?"
- "Winners, what was your strategy in meme mode?"

**The line to land:** "Same supply and demand. Same fair price. Opposite sign. One market settles, the other one runs away."
-->

---

<div class="tag">Market equilibrium · Stability and time paths</div>

# One equilibrium, two time paths

$$
\begin{array}{ll}
\text{Price adjustment} & p-p^*=(p_0-p^*)e^{-\lambda(d_1+s_1)t}\\[10pt]
\text{Market clearing with expectations} & p-p^*=(p_0-p^*)e^{kt}
\end{array}
$$

<div class="result">The coefficient on the price gap determines whether a shock fades or grows.</div>


<!--
**The big idea, one last time:** the equilibrium price is the same in both models. What decides whether a shock fades or grows is the sign in front of the gap.

**Point at the top line (price adjustment).**
- "Model one. The gap times e to minus lambda d1 plus s1 t. Negative exponent. The gap shrinks. Stable."

**Point at the bottom line (expectations).**
- "Model two. The gap times e to the k t. Positive exponent. The gap grows. Unstable."

**Point at the box.**
- "Both models give the same p star. If you only solved for where the curves cross, you'd think they're the same market."
- "They're not. To know what happens after a shock, you need the equation for how the price moves."

**Tie to the game:** "You saw it. First half you pulled the price back. Second half the exact same market, plus one feedback loop, and it ran away."
-->

---

<div class="tag">The takeaway</div>

# Conclusion

Setting $q_d=q_s$ allows us to find the equilibrium price. Differential equations then allow us to predict if and how the market reaches this price.

<div class="analogy-grid">
<div v-click="1">

### Price adjustment model

The gap decays at rate $\lambda(d_1+s_1)$. Every path converges to $p^*$.

</div><div v-click="2">

### Expectations model

The gap grows at rate $k=\frac{d_1+s_1}{d_2+s_2}$. Only $p_0=p^*$ stays put.

</div></div>

<div v-click="3" class="result">Self-reinforcing expectations can make an otherwise ordinary market unstable.</div>

<!--
**The big idea:** finding where supply meets demand is only half the job. Whether the market ever gets there depends on how the price moves.

**Point at the opening line.**
- "Setting demand equal to supply tells you where a market could rest. It doesn't tell you if the price will ever get there."

[click] **Price adjustment model.**
- "When prices just react to shortages and surpluses, the gap shrinks at rate lambda times d1 plus s1. Every starting price ends up at p star."

[click] **Expectations model.**
- "When people also react to the trend, the gap grows at rate k. The only path that stays at p star is the one that starts there."

[click] **The box.**
- "So expectations alone can take a perfectly ordinary market and make it unstable."

**If there's time, the honest limits:** "Our models are simplified: straight-line supply and demand, constants that never change, and nothing stopping a negative price. Natural next steps are adaptive expectations, a price floor, or combining both effects in one model."

**Close:** "Thanks. Questions?"
-->
