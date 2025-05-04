// didn't actually yield that good results, poker is harder than I was expecting
poker state machine

based on the current implementation of the poker state machine, I want you to implement a new version. the state machine receives events and outputs the new state, and exposes that as a rxjs `BehaviorSubject`. I want architecture to be functional: functions may have internal mutation on cloned state, but all components need to be pure (i.e. (state, events) in -> state out)

events:
- player moves
- players entering or leaving the table

phases:
1. WAITING (not enough players in the table, let there be a param for minimum players before game starts)
2. after enough players enter the table, start PLAYING
3. deal cards, rotate and collect blinds
4. players bet until
4.1. a full rotation goes on without raising
4.2. at most one of the remaining players isn't all-in
4.3. all but one player has folded (go to 6? but you don't want to reveal hand, maybe create another state only for pot distribution)
5. TRANSITION, burn and flip community cards and unless the river is already dealt go back to 4
6. RESULTS, check hands, determine winner, distribute pot

details:
1. first player is the one after the dealer, except when there are only two players, then it is the dealer, and after the flop it becomes the other player
