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

<div class="tag">The trading floor · Differential equations</div>

<div class="split"><div>

# Market equilibrium

Stability and time paths

<div class="credit">Zayd Krunz &amp; David Garcia</div>
</div><img :src="basePath + 'cover.svg'" alt="One price path approaches equilibrium while another falls away."/></div>

<script setup>
const basePath = import.meta.env.BASE_URL
</script>

<!--
Suppose a market has an equilibrium price of ten dollars, but the current price is nine dollars. Will the price rise toward ten dollars, or keep falling? We’ll compare two models that give different answers. In the first, prices respond to excess demand. In the second, buyers and sellers also respond to whether the price is rising or falling. Both models have the same equilibrium price. We’ll solve their differential equations to see what happens over time, then play a trading game.
-->

---

<div class="tag">The starting point</div>

# Where do buyers and sellers agree?

<div class="split"><div>

$$
q_d=d_0-d_1p
$$

$$
q_s=-s_0+s_1p
$$


Equating demand and supply gives

$$
p^*=\frac{d_0+s_0}{d_1+s_1}.
$$

Move the price above and below the crossing.

</div><MarketLab mode="supply" /></div>

<!--
The subscripts d and s stand for demand and supply. A higher price reduces the quantity buyers want and increases the quantity sellers offer. In this graph, demand is ten minus the price and supply is the price minus two. They match at six dollars. At four dollars, buyers want six units and sellers offer two. That leaves four units of excess demand. Move the price to eight dollars and the imbalance reverses. The first model uses that imbalance to determine how the price moves.
-->

---

<div class="tag">Part A · Price adjustment</div>

# Follow the gap from equilibrium

$$
\begin{aligned}
p' &= \lambda(q_d-q_s)\\
   &= \lambda\big[d_0+s_0-(d_1+s_1)p\big]\\
   &= -\lambda(d_1+s_1)(p-p^*).
\end{aligned}
$$

Set $x=p-p^*$ and $c=-\lambda(d_1+s_1)$. Then $x'=cx$.

<div v-click class="result">

$x(t)=x(0)e^{ct}\quad\Rightarrow\quad p(t)=p^*+(p_0-p^*)e^{ct}.$

</div>

<!--
Here price rises in proportion to excess demand. Lambda tells us how quickly price responds. When we subtract supply, the minus sign turns its negative intercept positive. To factor the next line, notice that the sum of the two slopes times the equilibrium price gives us the sum of the intercepts. Now shift the origin to equilibrium. Since the star is constant, the gap and the price have exactly the same derivative. We get the familiar exponential equation. Its starting value is the initial price minus the star. Adding the star back gives the requested price path.
-->

---

<div class="tag">Part B · Global stability</div>

# Every starting price returns

<div class="split"><div>

Since $c<0$, the factor $e^{ct}$ shrinks to zero.

$$
\lim_{t\to\infty}p(t)=p^*
$$

The gap keeps its sign as it shrinks.

</div><MarketLab mode="stable" /></div>


<!--
Move the speed slider. All four paths still approach ten dollars, but they get there at different speeds. Pick any starting price. Its distance from equilibrium gets multiplied by the same shrinking exponential. A price above the line falls. A price below the line rises. Neither crosses the line because the exponential stays positive. If we start exactly on the line, the gap is zero forever. That word every is what makes this equilibrium globally stable.
-->

---

<div class="tag">Part C · Expectations</div>

# What if buyers expect a price change?

$$
q_d=d_0-d_1p+d_2p' \qquad q_s=-s_0+s_1p-s_2p'
$$

When the price rises, buyers bring purchases forward and sellers hold units back.

<div class="result">

Require $q_d=q_s$ at every instant. What slope $p'$ makes that possible?

</div>

<!--
In the second model, people use the current price trend to anticipate where the price is going. Imagine learning that the price of a concert ticket is going up. You have a reason to buy today. Someone holding a spare ticket has a reason to wait. Those two decisions explain the opposite signs on the derivative terms. We now require every unit demanded to match a unit supplied at each instant. The equation we solve comes from that requirement.
-->

---

<div class="tag">Part C · Market-clearing path</div>

# Solve for the slope that clears the market

$$
\begin{aligned}
d_0-d_1p+d_2p' &= -s_0+s_1p-s_2p'\\
(d_2+s_2)p' &= (d_1+s_1)p-(d_0+s_0)\\
p' &= k(p-p^*),\qquad k=\frac{d_1+s_1}{d_2+s_2}>0.
\end{aligned}
$$

<div v-click class="result">

Using $x=p-p^*$ again gives $\displaystyle p(t)=p^*+(p_0-p^*)e^{kt}$.

</div>

<!--
Move both derivative terms to the left. On the right the price terms are positive and the intercept terms are negative. Factoring out the sum of the price slopes leaves the same gap we saw earlier. We can reuse the exponential solution immediately. The sign has changed. Below equilibrium, for example, ordinary demand would exceed supply. A falling price makes buyers wait and brings more supply forward. That negative slope is precisely what allows the market to clear.
-->

---

<div class="tag">Part D · Stability with expectations</div>

# Can a market clear and still drift away?

<div class="split"><div>

$k>0$, so $e^{kt}$ grows.

Above $p^*$, the price rises. Below $p^*$, it falls.

Only $p_0=p^*$ gives a constant path.

</div><MarketLab mode="unstable" /></div>


<!--
Yes. Every point on both curves satisfies demand equals supply. But pick a starting price even slightly above the star, and the positive gap grows exponentially. Start slightly below, and the gap becomes increasingly negative. Either curve is a counterexample to the claim that every clearing path converges. The equilibrium itself is unstable. Now increase the trend reaction slider. Since that sum is in the denominator of k, the paths move away more slowly. They still move away.
-->

---

<div class="tag">Compare the feedback</div>

# Which way does a small push send it?

<div class="analogy-grid">
<div v-click="1">

### Price adjustment

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
Think of equilibrium as the ball's resting position. In the valley, a small push sends the ball back toward the bottom. On the hilltop, a small push sends it farther away. The price equations describe those same two directions of motion. For the first equation, the minus sign reverses the direction of the price gap. For the second, the positive coefficient preserves it. These pictures illustrate stability. Our price equations are first order, so they do not include a physical ball's inertia or bouncing.
-->

---

<div class="tag">Part E · Starting at five dollars</div>

# What price does the model predict?

$$
30-2p+4p'=-20+p-6p' \quad\Rightarrow\quad 10p'=3p-50.
$$

$$
p^*=\frac{50}{3},\qquad p_0-p^*=5-\frac{50}{3}=-\frac{35}{3}.
$$

$$
p(t)=\frac{50}{3}-\frac{35}{3}e^{3t/10}
$$

<div v-click class="result">

At month ten, $\displaystyle p(10)=\frac{50-35e^3}{3}\approx-\$217.66$.

</div>

<!--
Time is measured in months. Collect the four and six derivative terms and we get ten times the price derivative on the left. Setting that derivative to zero gives about sixteen dollars and sixty-seven cents. We start at just five dollars, already well below equilibrium. Substituting ten months puts a three in the exponent. The negative starting gap has grown by a factor of about twenty, giving a strikingly negative price.
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
Differentiate the price path. The slope is already negative and gets more negative every month. Buyers expecting a bigger drop have a stronger incentive to wait. Sellers have a stronger incentive to sell now. Those effects are relative to what they would do at the same price with no trend. To find when the price reaches zero, set the exponential equal to fifty over thirty-five and take a logarithm. That gives about one point one nine months. If this product requires a nonnegative price, the model has already left its useful range long before month ten.
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
Suppose the price is falling. Buyers can wait for a better deal, which reduces demand through the four times p prime term. Sellers want to sell before the next drop, which increases supply through minus six times p prime. Those are comparisons at the same price. Along the full path, the falling price also attracts buyers, so the total quantity traded can still increase. The clearing equation combines all those effects. It gives a negative slope that becomes more negative as the price moves farther below equilibrium.
-->

---

<div class="tag">Live trading · Buyers and sellers</div>

# Closing Bell

Scan the code on the projector. You get a secret card and a role.

| Buyer | Seller |
|---|---|
| Never pay more than your limit. Profit = limit − price. | Never sell below your floor. Profit = price − floor. |

Find someone on the other side, haggle, and report the deal. They confirm. Before each round, predict the close: within $10 earns a bonus.

<div class="result"><a href="https://market.zaydkrunz.com/" target="_blank">Open the trading floor ↗</a></div>

<!--
Get your phones out. Scan the code and pick a trader name. Half of you are buyers and half are sellers. Your card is private. Buyers, it's the most you can pay. Sellers, it's the least you'll take. Walk around, haggle out loud, and when you agree on a price, one of you reports it and the other confirms. The app blocks any trade that loses you money. Cards expire, so trade or lose them. Before each round the projector shows the demand and supply equations. Use them to predict the closing price for bonus money. At halftime, buyers and sellers swap, and the market changes: your card starts moving with the chart. Most money on the Rich List at the end wins.
-->

---

<div class="tag">Closing Bell · Desk recap</div>

# Did your class match the math?

| First half · Blue chip | Second half · Meme mode |
|---|---|
| $p' = -\lambda(d_1+s_1)(p-p^*)$ | Cards shift by $\beta p'$, so $p' = k(p-p^*)$ |
| The opening gap shrank toward $p^*$. | A small push turned into a bubble. |

<!--
The results screen fit an exponential to every round of your trades. In the first half, your fitted rate was negative: the gap from equilibrium decayed, just like the price-adjustment model. That gives us an estimate of your class's lambda. In the second half, the only change was that each card moved with the price trend. That's the d2 and s2 terms from part C. The fitted rate turned positive, and a five-dollar push in the pre-market kept growing until it burst. Same supply and demand, same equilibrium price, opposite stability.
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

<div class="credit">Exercise by James E. Foster · George Washington University</div>

<!--
Think back to the moment the background desks switched strategies. In the homework, a change in how buyers and sellers respond also flips the sign on the price gap. Both models give exactly the same price when the derivative is zero. To predict what happens after a shock, we need the equation for how the price moves.
-->
