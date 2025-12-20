##
# @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# @fileoverview This script restarts travis builds that have either:
#   1) timed out due to flakiness
#   2) failed due to no screenshots collected in the trace.
# It looks for builds from the past 3 days, and within each build it finds the job(s) that failed
# or timed out, and restarts 'em.

# step 1. generate github token and and use in .netrc
#   https://help.github.com/articles/creating-an-access-token-for-command-line-use/
#   Leave all scope checkboxes unchecked.
#   Place in your ~/.netrc file like so:
#     machine github.com login <token>

# step 2. install travis ruby library: https://github.com/travis-ci/travis.rb/
#   gem install travis
#   travis login --auto

# step 3. run this script.
#   ruby lighthouse-core/scripts/restart-travis-builds.rb
# To run it every 2 minutes...
#   while true; ruby lighthouse-core/scripts/restart-travis-builds.rb; sleep 120s; end;

# optional step 4. you might also want to keep an eye on all starts, failures, and passes:
#   travis monitor

require 'travis'
require 'date'

config_path = ENV.fetch('TRAVIS_CONFIG_PATH') { File.expand_path('.travis', Dir.home) }
config = YAML.load_file(File.expand_path('config.yml', config_path))
access_token = config['endpoints'].values[0]['access_token']

Travis.access_token = access_token

puts "Logged in travis id: #{Travis::User.current.login}"

def restart_builds
  repository = Travis::Repository.find('GoogleChrome/lighthouse')
  repository.each_build do |build|
    # failed builds are failed. errored = timed out, or another problem.
    next unless build.errored? or build.failed? or build.started?

    # only consider builds from the last 3 days
    next if build.started_at.nil?

    # quit paginating at some point.
    if build.started_at < Time.now.to_date.prev_day(3).to_time
      # cancel the restart
      puts ''
      puts 'Paginated to a build from 3 days ago. Stopping.'
      exit 0
    end

    # skip old builds (more than 1 day old)
    next if build.started_at < Time.now.to_date.prev_day(1).to_time

    puts "  Build #{build.number} #{build.state} #{to_pretty(build.started_at)}. Looking at jobs..."

    build.jobs.each do |job|

      if job.started? and job.log.body.include? "Could not handle JavaScript dialog"
        puts "  👺  Job #{job.number} started to fail because of handleJavaScriptDialog 🔳  "
        puts "      Restarting job #{job.number}"
        job.restart
        next
      end

      if job.failed? and job.log.body.include? "Could not handle JavaScript dialog"
        puts "  👺  Job #{job.number} failed because of handleJavaScriptDialog 🔳  "
        puts "      Restarting job #{job.number}"
        job.restart
        next
      end

      if job.failed? and job.log.body.include? "No screenshots found in trace"
        puts "  👺  Job #{job.number} failed because of screenshots 🖼 "
        puts "      Restarting job #{job.number}"
        job.restart
        next
      end

      # skip non-timeout builds
      next unless job.errored?
      # skip builds finished under 10 minute timeout
      next if job.duration < 600

      duration = Time.at(job.duration).utc.strftime('%Mm %Ss')
      puts "  👺  Job #{job.number} finished #{to_pretty(job.finished_at)}, took #{duration} 🕒"
      puts "      Restarting job #{job.number}"
      # restart the job
      job.restart
    end
  end
end

# Thank you, StackOverflow. ;)
#   http://stackoverflow.com/questions/195740/how-do-you-do-relative-time-in-rails
def to_pretty(start_time)
  a = (Time.now - start_time).to_i

  case a
  when 0 then 'just now'
  when 1 then 'a second ago'
  when 2..59 then a.to_s + ' seconds ago'
  when 60..119 then 'a minute ago' # 120 = 2 minutes
  when 120..3_540 then (a / 60).to_i.to_s + ' minutes ago'
  when 3_541..7_100 then 'an hour ago' # 3600 = 1 hour
  when 7_101..172_000 then ((a + 99) / 3600).to_i.to_s + ' hours ago'
  when 172_001..518_400 then ((a + 800) / (60 * 60 * 24)).to_i.to_s + ' days ago'
  when 518_400..1_036_800 then 'a week ago'
  else ((a + 180_000) / (60 * 60 * 24 * 7)).to_i.to_s + ' weeks ago'
  end
end

restart_builds
