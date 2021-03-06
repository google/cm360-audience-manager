/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * @class JobUtil representing a utility class for properly deserializing Job
 * types.
 */
class JobUtil {

  /**
   * Converts a parsed JSON representation of a Job or a child type into a
   * proper instance of Job or the child type.
   * @see Runner#handler_
   * @see jobs.js#invoke_
   *
   * @param {!Object} parsedObj The result of JSON.parse on the serialized JSON
   *     string representation of Job or a child type
   * @return {!Job} An instance of Job or the child type
   */
  static fromJson(parsedObj) {
    const jobType = parsedObj.jobType_ || JobType.GENERIC;
    let job = null;

    switch(jobType) {
      case JobType.AUDIENCE_CREATE:
        job = this.audienceCreateJobFromJson_(parsedObj);
        break;
      case JobType.AUDIENCE_UPDATE:
        job = this.audienceUpdateJobFromJson_(parsedObj);
        break;
      default:
        job = this.jobFromJson_(parsedObj);
    }
    return job;
  }

  /**
   * Converts a parsed JSON representation of a Job into a proper instance of
   * Job, handling proper deserialization of inner jobs.
   *
   * @param {!Object} parsedObj The result of JSON.parse on the serialized JSON
   *     string representation of Job
   * @return {!Job} An instance of Job
   * @private
   */
  static jobFromJson_(parsedObj) {
    const id = parsedObj.id_ || 0;
    const index = parsedObj.index_ || 0;
    const status = parsedObj.status_ || JobStatus.PENDING;
    const offset = parsedObj.offset_ || 0;
    const error = parsedObj.error_ || '';
    const jobType = parsedObj.jobType_ || JobType.GENERIC;

    let logs = [];
    if (parsedObj.logs_) {
      logs = parsedObj.logs_.map((log) => {
        if (log.date && log.message) {
          return {
            date: new Date(log.date),
            message: log.message,
          };
        }
        return log;
      });
    }

    let jobs = [];
    if (parsedObj.jobs_) {
      jobs = parsedObj.jobs_.map((job) => this.fromJson(job));
    }

    const job =
        new Job(id, index, /* run= */ true, logs, jobs, offset, error, jobType);
    this.updateJobStatus_(job, status, error);

    return job;
  }

  /**
   * Converts a parsed JSON representation of an AudienceCreateJob into a
   * proper instance of AudienceCreateJob.
   *
   * @param {!Object} parsedObj The result of JSON.parse on the serialized JSON
   *     string representation of AudienceCreateJob
   * @return {!AudienceCreateJob} An instance of AudienceCreateJob
   * @private
   */
  static audienceCreateJobFromJson_(parsedObj) {
    const job = this.jobFromJson_(parsedObj);

    const extParams = {
      audienceName: parsedObj.audienceName_,
      description: parsedObj.description_,
      lifeSpan: parsedObj.lifeSpan_,
      floodlightId: parsedObj.floodlightId_,
      idx: job.getIndex(),
    };

    const audienceCreateJob = new AudienceCreateJob(extParams, {
      id: job.getId(),
      index: job.getIndex(),
      run: true,
      logs: job.getLogs(),
      jobs: job.getJobs(),
      offset: job.getOffset(),
      error: job.getError(),
      jobType: job.getJobType(),
    });

    const audienceRules = parsedObj.audienceRules_;
    const relationship = audienceRules.relationship ?
        AudienceRuleRelationshipType[audienceRules.relationship] :
        AudienceRuleRelationshipType.AND;
    const rules = audienceRules.rules || [];

    if (rules.length !== 0) {
      audienceCreateJob.addAudienceRules(rules, relationship);
    }

    const status = parsedObj.status_ || JobStatus.PENDING;
    this.updateJobStatus_(audienceCreateJob, status, job.getError());

    return audienceCreateJob;
  }

  /**
   * Converts a parsed JSON representation of an AudienceUpdateJob into a
   * proper instance of AudienceUpdateJob.
   *
   * @param {!Object} parsedObj The result of JSON.parse on the serialized JSON
   *     string representation of AudienceUpdateJob
   * @return {!AudienceUpdateJob} An instance of AudienceUpdateJob
   * @private
   */
  static audienceUpdateJobFromJson_(parsedObj) {
    const job = this.jobFromJson_(parsedObj);

    const extParams = {
      audienceId: parsedObj.audienceId_,
      audienceListResource: parsedObj.audienceListResource_,
      changedAttributes: parsedObj.changedAttributes_,
      idx: job.getIndex(),
      shareableWithAllAdvertisers: parsedObj.shareableWithAllAdvertisers_,
    };

    const audienceUpdateJob = new AudienceUpdateJob(extParams, {
      id: job.getId(),
      index: job.getIndex(),
      run: true,
      logs: job.getLogs(),
      jobs: job.getJobs(),
      offset: job.getOffset(),
      error: job.getError(),
      jobType: job.getJobType(),
    });
    const status = parsedObj.status_ || JobStatus.PENDING;
    this.updateJobStatus_(audienceUpdateJob, status, job.getError());

    return audienceUpdateJob;
  }

  /**
   * Updates the job's status as it is reset on creation based on the value of
   * the 'run' boolean flag.
   *
   * @param {!Job} job The job to set the status for
   * @param {string} status The status to set
   * @param {string} error The error to set in case of an ERROR status
   * @private
   */
  static updateJobStatus_(job, status, error) {
    switch(status) {
      case JobStatus.RUNNING:
        job.run();
        break;
      case JobStatus.COMPLETE:
        job.complete();
        break;
      case JobStatus.ERROR:
        job.error(error);
        break;
    }
  }
}

