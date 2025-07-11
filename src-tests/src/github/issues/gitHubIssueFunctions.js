"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateFullGHIssueInStream = StateFullGHIssueInStream;
exports.StateMultipleGHIssuesInStream = StateMultipleGHIssuesInStream;
exports.searchGhIssuesByTitle = searchGhIssuesByTitle;
exports.getIssueAndCommentsById = getIssueAndCommentsById;
const gitHub_1 = require("../gitHub");
function StateFullGHIssueInStream(stream, issue, comments) {
    stream.markdown(`🟣Issue: **${issue.title}**\n\n`);
    stream.markdown(issue.body?.replaceAll("\n", "\n> ") + "");
    if (comments?.length > 0) {
        stream.markdown("\n\n_Comments_\n");
        comments?.map((comment) => stream.markdown(`\n> ${comment.body?.replaceAll("\n", "\n> ") + ""}\n`));
    }
    stream.markdown("\n\n----\n\n");
}
function StateMultipleGHIssuesInStream(stream, issues, searchQuery) {
    stream.markdown(`🔍 Found ${issues.length} issue${issues.length !== 1 ? 's' : ''} with title containing "${searchQuery}":\n\n`);
    issues.forEach((issue, index) => {
        stream.markdown(`${index + 1}. 🟣**Issue #${issue.number}** [_${issue.state}_]: **${issue.title}**\n`);
        // Show first 200 characters of description
        if (issue.body && issue.body.length > 0) {
            const truncatedBody = issue.body.length > 200 ? issue.body.substring(0, 200) + "..." : issue.body;
            stream.markdown(`   > ${truncatedBody.replaceAll("\n", " ")}\n`);
        }
        stream.markdown(`   🔗 [View Issue #${issue.number}](${issue.html_url})\n\n`);
    });
    stream.markdown("---\n\n");
}
//search issues by title (contains search)
async function searchGhIssuesByTitle(requestHandlerContext, searchQuery, ghOwner = "", ghRepo = "", withComments = false) {
    var { octokit, owner, repo } = await (0, gitHub_1.determineGhOwnerAndRepoToUse)(ghOwner, ghRepo, requestHandlerContext);
    try {
        // Search for open and closed issues that contain the search query in the title
        const searchResults = await octokit.rest.issues.listForRepo({
            owner,
            repo,
            state: 'all', // Include both open and closed issues
            sort: 'updated',
            direction: 'desc',
            per_page: 100 // Get more results to filter from
        });
        // Filter issues that contain the search query in the title (case-insensitive)
        // and exclude pull requests (GitHub's API returns PRs in issues endpoint)
        const matchingIssues = searchResults.data.filter(issue => issue.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !issue.pull_request // Exclude pull requests
        ).slice(0, 10); // Limit to 10 results to avoid overwhelming the user
        if (matchingIssues.length === 0) {
            throw new Error(`No issues found with title containing "${searchQuery}" in repo '${repo}'.`);
        }
        // Convert to GitHubResult array
        const results = [];
        for (const issue of matchingIssues) {
            let comments = [];
            if (withComments) {
                try {
                    comments = (await octokit.rest.issues.listComments({
                        owner,
                        repo,
                        issue_number: issue.number,
                    })).data;
                }
                catch (err) {
                    // If comments fail for one issue, continue with others
                    console.warn(`Could not get comments for issue #${issue.number}: ${err}`);
                }
            }
            results.push({
                data: {
                    number: issue.number,
                    title: issue.title,
                    body: issue.body || "",
                    html_url: issue.html_url,
                    state: issue.state
                },
                comments: comments
            });
        }
        return results;
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('No issues found')) {
            throw err;
        }
        throw new Error(`Error searching issues with title "${searchQuery}" in repo '${repo}': ${err}`);
    }
}
//get issue object from github by its issue id using octokit
async function getIssueAndCommentsById(requestHandlerContext, issue_number, ghOwner = "", ghRepo = "", withComments = false) {
    var { octokit, owner, repo } = await (0, gitHub_1.determineGhOwnerAndRepoToUse)(ghOwner, ghRepo, requestHandlerContext);
    let issue = {};
    try {
        issue = (await octokit.rest.issues.get({
            owner,
            repo,
            issue_number,
        })).data;
    }
    catch (err) {
        throw new Error(`Can't find issue #${issue_number} in repo '${repo}'.`);
    }
    try {
        let comments = [];
        if (withComments) {
            comments = (await octokit.rest.issues.listComments({
                owner,
                repo,
                issue_number,
            })).data;
        }
        return { data: issue, comments: comments };
    }
    catch (err) {
        throw new Error(`Can't get comments for issue #${issue_number} of repo '${repo}'.`);
    }
}
