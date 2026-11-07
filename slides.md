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
---

<div class="tag">Capstone differential equations</div>

<div class="split"><div>

# Market equilibrium

Stability and time paths

<div class="credit">Zayd Krunz &amp; David Garcia</div>
</div><img :src="basePath + 'cover.svg'" alt="One price path approaches equilibrium while another falls away."/></div>

<script setup>
const basePath = import.meta.env.BASE_URL
</script>

<!--
Imagine two markets with exactly the same equilibrium price. In each one, the price starts a dollar below equilibrium. In one market that dollar gap gradually disappears. In the other it doubles, then doubles again. How can the same supply and demand curves give us both outcomes? We’ll solve for the price in each market, then you’ll get to run one.
-->

---

<div class="tag">The starting point</div>

# Where do buyers and sellers agree?

$$
q_d=d_0-d_1p \qquad q_s=-s_0+s_1p
$$

At a steady price, equate the quantities and collect the price terms.

$$
d_0-d_1p^*=-s_0+s_1p^*
\quad\Longrightarrow\quad
p^*=\frac{d_0+s_0}{d_1+s_1}.
$$

<div class="result">Below this price, buyers want more units than sellers offer.</div>

<!--
The subscripts d and s stand for demand and supply. All the parameters are positive. A higher price therefore reduces the number of units buyers want and increases the number sellers offer. The star marks the price where those two quantities match. Imagine posting a price a dollar below the star. More buyers show up, while fewer sellers find it worth selling. What happens to tomorrow’s price depends on the rule we give the market.
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

<div class="result">

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

</div><img :src="basePath + 'stable.svg'" alt="Paths from above and below approach the dashed equilibrium price."/></div>

<script setup>
const basePath = import.meta.env.BASE_URL
</script>

<!--
Pick any starting price. Its distance from equilibrium gets multiplied by the same shrinking exponential. A price above the line falls. A price below the line rises. Neither crosses the line because the exponential stays positive. If we start exactly on the line, the gap is zero forever. That word every is what makes this equilibrium globally stable.
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

<div class="result">

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

</div><img :src="basePath + 'unstable.svg'" alt="Paths on either side diverge from the equilibrium price."/></div>

<script setup>
const basePath = import.meta.env.BASE_URL
</script>

<!--
Yes. Every point on both curves satisfies demand equals supply. But pick a starting price even slightly above the star, and the positive gap grows exponentially. Start slightly below, and the gap becomes increasingly negative. Either curve is a counterexample to the claim that every clearing path converges. The equilibrium itself is unstable.
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

<div class="result">

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

</div><img :src="basePath + 'example.svg'" alt="Price passes zero at 1.19 months and falls ever faster through month ten."/></div>

<div class="result">The price crosses zero after just 1.19 months.</div>

<script setup>
const basePath = import.meta.env.BASE_URL
</script>

<!--
Differentiate the price path. The slope is already negative and gets more negative every month. Buyers expecting a bigger drop have a stronger incentive to wait. Sellers have a stronger incentive to sell now. Those effects are relative to what they would do at the same price with no trend. To find when the price reaches zero, set the exponential equal to fifty over thirty-five and take a logarithm. That gives about one point one nine months. If this product requires a nonnegative price, the model has already left its useful range long before month ten.
-->

---

<div class="tag">Live trading · TSLA</div>

# Closing Bell

A robotaxi announcement just hit the wire. You have 96 seconds to trade against the room.

| Go long | Sell short | Go flat |
|---|---|---|
| Hold 3 shares. You want the price up. | Owe 3 shares. You want the price down. | Close your position. Keep your gains or losses. |

<div class="result"><a href="https://market.zaydkrunz.com/" target="_blank">Open the trading floor ↗</a></div>

<!--
Get your phones out. Scan the code on the projector and give your desk a name. We’re trading a fictional Tesla stock that starts at a hundred dollars. Going long puts you three shares long. Short does the reverse. Go flat to cash out. You can change your mind at the next quote, but every share you trade costs a quarter. The highest profit at the closing bell wins. Watch what happens when Albert Wang publishes research in the middle of a trading session.
-->

---

<div class="tag">Closing Bell · Desk recap</div>

# Who traded the tweet?

Winning desk, pick one post. What did you think the rest of the room would do?

| First half | Second half |
|---|---|
| A price above $100 attracts sellers. | A price above $100 attracts momentum buyers. |
| The gap tends to shrink. | The gap tends to grow. |

<!--
Give us your best trade. Did you believe the post, or did you think everybody else would? Look at the chart around the third bell. That’s when the background traders changed sides. The same price gap that used to attract sellers could suddenly attract buyers. The posts and your own orders could overpower either effect. Underneath all that noise is the exact sign change we saw in the homework.
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
