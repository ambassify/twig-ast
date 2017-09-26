const assert = require('assert');

const { toAST } = require('../src');

describe('toAST', () => {
    it('should generate an AST without errors #1', () => {
        toAST(`
            {% with { manage_var: "hello world" } %}
                Hello {{planet}}
            {% endwith %}
        `);
    })

    it('should generate an AST without errors #2', () => {
        toAST(`
            <p>{% with { manage_var_name: "ContentItemURL" } %}
                https://dev.ambassify.com/detail/9961?token={{ persona_token(creatorToken, { orgId: recipient.orgId, id: recipient.id }) }}
            {% endwith %}</p>
            <p>{% with { manage_var_name: "ContentItemURL" } %}
                https://dev.ambassify.com/detail/9961?token={{ persona_token(creatorToken, { orgId: recipient.orgId, id: recipient.id }) }}
            {% endwith %}</p>
            <p><a href="https://dev.ambassify.com/auth/login?token={{ persona_token(creatorToken, { id: recipient.id, orgId: 1333.12, abc: null, meta: { person: { accessCommunity: true, groups: ["Winners","testgroup"] } } }) }}">Dit is een test</a></p>
        `);
    });

    it('should generate an AST without errors #3', () => {
        toAST(`
            <p>Dear {{profile.givenName}}</p>

            <p>{% if recipient.accessCommunity %} We noticed you&rsquo;ve collected {{recipient.points}} points {% endif %} You qualify for this super awesome reward. Claim the reward by clicking the button below. {% if recipient.accessCommunity and rewardUrlData %} You&#39;ll be charged {{rewardUrlData.cost}} points! {% endif %} {% if rewardUrlData %}</p>

            <table cellpadding="0" cellspacing="0" class="item" contenteditable="false">
                <tbody>
                    <tr>
                        <td class="item__title-cell">
                        <h2>{{ rewardUrlData.title }}</h2>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" class="item__image-cell">
                        <p><img alt="Reward image" border="0" src="{{ rewardUrlData.visual }}" width="425" /></p>
                        </td>
                    </tr>
                    <tr>
                        <td class="item__content-cell">
                        <p>{{ rewardUrlData.description|raw }}</p>
                        </td>
                    </tr>
                    <tr>
                        <td class="item__cta-cell"><a class="button" contenteditable="true" href="{{ include(template_from_string(rewardUrl)) }}">Claim Reward </a></td>
                    </tr>
                </tbody>
            </table>

            <p>{% endif %}</p>
        `);
    })

    it('should throw on an invalid template', () => {
        assert.throws(() => {
            toAST('{{ hello world');
        });
    })

    it('should prevent endless loop on invalid character', () => {
        assert.throws(() => {
            toAST(`
                {% with { manage_var_name: "\\"contentItemUrl\\"" } %} https://dev.ambassify.com/detail/10165?token={{ persona_token(creatorToken, { {% endwith %}
            `);
        });
    })
});
