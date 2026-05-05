/*:
 * @target MZ
 * @plugindesc Leaderboard system tracking completion time
 * @author Claude
 */

(() => {
    const supabaseUrl = window.GAME_CONFIG?.SUPABASE_URL;
    const supabaseKey = window.GAME_CONFIG?.SUPABASE_ANON_KEY;

    let supabase = null;
    if (typeof window.supabase !== 'undefined' && supabaseUrl && supabaseKey) {
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    }

    window.LeaderboardManager = class {
        static startTime = null;
        static completionTime = null;

        static startTimer() {
            this.startTime = Date.now();
            $gameVariables.setValue(100, this.startTime);
        }

        static async completeLevel() {
            if (!this.startTime && $gameVariables.value(100)) {
                this.startTime = $gameVariables.value(100);
            }

            this.completionTime = Date.now();
            const timeInSeconds = Math.floor((this.completionTime - this.startTime) / 1000);

            await this.submitScore(timeInSeconds);
            return timeInSeconds;
        }

        static async submitScore(timeInSeconds) {
            if (!supabase) {
                console.error('Supabase not configured');
                return;
            }
            if (!window.AuthManager || !window.AuthManager.currentUser) return;

            const { error } = await supabase
                .from('leaderboard')
                .insert({
                    user_id: window.AuthManager.currentUser.id,
                    username: window.AuthManager.currentUser.username,
                    completion_time: timeInSeconds
                });

            if (error) console.error('Leaderboard submit error:', error);
        }

        static async getTopScores(limit = 10) {
            if (!supabase) {
                console.error('Supabase not configured');
                return [];
            }

            const { data, error } = await supabase
                .from('leaderboard')
                .select('username, completion_time')
                .order('completion_time', { ascending: true })
                .limit(limit);

            return error ? [] : data;
        }

        static formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    };

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        if (!$gameVariables.value(100)) {
            LeaderboardManager.startTimer();
        }
    };

    const _Game_Switches_setValue = Game_Switches.prototype.setValue;
    Game_Switches.prototype.setValue = function(switchId, value) {
        _Game_Switches_setValue.call(this, switchId, value);
        if (switchId === 4 && value === true) {
            LeaderboardManager.completeLevel().then(time => {
                $gameMessage.add(`Completed in ${LeaderboardManager.formatTime(time)}!`);
            });
        }
    };
})();
